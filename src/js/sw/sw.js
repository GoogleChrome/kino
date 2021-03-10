import {
  SW_CACHE_NAME,
  STORAGE_SCHEMA,
  IDB_CHUNK_INDEX,
  MEDIA_SESSION_DEFAULT_ARTWORK,
  MEDIA_SERVER_ORIGIN,
} from '../constants';

import getIDBConnection from '../modules/IDBConnection.module';
import assetsToCache from './cache';

/**
 * Respond to a request to fetch offline video file and construct a response stream.
 *
 * Includes support for `Range` requests.
 *
 * @param {Request}     request    Request object.
 * @param {IDBDatabase} db         IDBDatabase instance.
 * @param {FileMeta}    fileMeta   File meta object.
 *
 * @returns {Response} Response object.
 */
const getResponseStream = (request, db, fileMeta) => {
  const rangeRequest = request.headers.get('range') || '';
  const byteRanges = rangeRequest.match(/bytes=(?<from>[0-9]+)?-(?<to>[0-9]+)?/);
  const rangeFrom = byteRanges?.groups?.from || 0;
  const rangeTo = byteRanges?.groups?.to || fileMeta.bytesTotal - 1;

  const stream = new ReadableStream({
    async start(controller) {
      const rawIDB = db.unwrap();
      const transaction = rawIDB.transaction(STORAGE_SCHEMA.data.name, 'readonly');
      const store = transaction.objectStore(STORAGE_SCHEMA.data.name);

      /**
       * Construct the range boundaries so that the returned chunks
       * cover the whole requested range.
       */
      const allEntriesForUrlRange = IDBKeyRange.bound(
        [request.url, -Infinity, rangeFrom],
        [request.url, rangeTo, Infinity],
      );
      const index = store.index(IDB_CHUNK_INDEX);
      const cursor = index.openCursor(allEntriesForUrlRange);

      cursor.onsuccess = (e) => {
        const newCursor = e.target.result;
        if (newCursor) {
          const dataObject = newCursor.value;
          const needsSlice = dataObject.rangeStart < rangeFrom || dataObject.rangeEnd > rangeTo;

          if (needsSlice) {
            const sliceBufferFrom = Math.max(0, rangeFrom - dataObject.rangeStart);
            const sliceBufferTo = Math.min(
              dataObject.rangeEnd - dataObject.rangeStart,
              rangeTo - dataObject.rangeStart,
            );
            const bufferSlice = new Uint8Array(
              dataObject.data.slice(sliceBufferFrom, sliceBufferTo),
            );
            controller.enqueue(bufferSlice);
          } else {
            controller.enqueue(dataObject.data);
          }
          newCursor.continue();
        } else {
          controller.close();
        }
      };
      cursor.onerror = controller.close;
    },
  });

  const responseOpts = {
    status: rangeRequest ? 206 : 200,
    statusText: rangeRequest ? 'Partial Content' : 'OK',
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Type': fileMeta.mimeType || 'application/octet-stream',
      'Content-Length': rangeTo - rangeFrom + 1,
    },
  };
  if (rangeRequest) {
    responseOpts.headers['Content-Range'] = `bytes ${rangeFrom}-${rangeTo}/${fileMeta.bytesTotal}`;
  }
  const response = new Response(stream, responseOpts);
  return response;
};

/**
 * If the request is for a video file that we have downloaded in IDB,
 * respond with the local file.
 *
 * @param {Event} event The `fetch` event.
 *
 * @returns {Promise<Response>|null} Promise that resolves with a `Response` object.
 */
const maybeGetVideoResponse = async (event) => {
  const db = await getIDBConnection();
  /**
   * @type {FileMeta}
   */
  const fileMeta = await db.file.get(event.request.url);

  if (fileMeta && fileMeta.done) {
    return getResponseStream(event.request, db, fileMeta);
  }
  return null;
};

/**
 * Precache all application assets.
 *
 * @param {Event} event Install event.
 */
const precacheAssets = (event) => {
  /**
   * Default artwork for Media Session API.
   */
  MEDIA_SESSION_DEFAULT_ARTWORK.forEach(
    (artworkObject) => assetsToCache.push(artworkObject.src),
  );

  event.waitUntil(
    caches.open(SW_CACHE_NAME).then((cache) => cache.addAll(assetsToCache)),
  );
};

/**
 * The main fetch handler.
 *
 * @param {FetchEvent} event Fetch event.
 */
const fetchHandler = async (event) => {
  const getResponse = async () => {
    const openedCache = await caches.open(SW_CACHE_NAME);

    const cacheResponse = await openedCache.match(event.request);
    if (cacheResponse) return cacheResponse;

    if (event.request.url.indexOf(MEDIA_SERVER_ORIGIN) === 0) {
      const videoResponse = await maybeGetVideoResponse(event);
      if (videoResponse) return videoResponse;
    }

    return fetch(event.request);
  };
  event.respondWith(getResponse());
};

/* eslint-disable no-restricted-globals */
self.addEventListener('install', precacheAssets);
self.addEventListener('fetch', fetchHandler);
/* eslint-enable no-restricted-globals */
