import {
  SW_CACHE_NAME,
  STORAGE_SCHEMA,
  IDB_CHUNK_INDEX,
  MEDIA_SESSION_DEFAULT_ARTWORK,
} from '../constants';

import getIDBConnection from '../modules/IDBConnection.module';

/**
 * Respond to a request to fetch offline video and contruct a response stream.
 *
 * Includes support for `Range` requests.
 *
 * @param {Request} request   Request object.
 * @param {IDBDatabase} db    IDBDatabase instance.
 * @param {object} metaEntry  Video metadata from the IDB.
 *
 * @returns {Response} Response object.
 */
const getResponseStream = (request, db, metaEntry) => {
  const rangeRequest = request.headers.get('range') || '';
  const byteRanges = rangeRequest.match(/bytes=(?<from>[0-9]+)?-(?<to>[0-9]+)?/);
  const rangeFrom = byteRanges.groups?.from || 0;
  const rangeTo = byteRanges.groups?.to || metaEntry.sizeInBytes - 1;

  const stream = new ReadableStream({
    async start(controller) {
      const rawIDB = db.unwrap();
      const transaction = rawIDB.transaction(STORAGE_SCHEMA.data.name, 'readonly');
      const store = transaction.objectStore(STORAGE_SCHEMA.data.name);
      const allEntriesForUrlRange = IDBKeyRange.bound(
        [metaEntry.videoId, request.url, 0, rangeFrom],
        [metaEntry.videoId, request.url, rangeTo, Infinity],
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
      'Content-Type': metaEntry.mime || 'application/octet-stream',
      'Content-Length': rangeTo - rangeFrom + 1,
    },
  };
  if (rangeRequest) {
    responseOpts.headers['Content-Range'] = `bytes ${rangeFrom}-${rangeTo}/${metaEntry.sizeInBytes}`;
  }
  const response = new Response(stream, responseOpts);
  return response;
};

/**
 * Respond to a offline video request.
 *
 * @param {Event} event The `fetch` event.
 *
 * @returns {Promise|Response} Promise that resolves with a `Response` object.
 */
const maybeGetVideoResponse = async (event) => {
  const db = await getIDBConnection();
  const metaEntry = await db.meta.get(event.request.url);

  if (metaEntry.done) {
    return getResponseStream(event.request, db, metaEntry);
  }
  return null;
};

/**
 * Precache all application assets.
 *
 * @param {Event} event Install event.
 */
const precacheAssets = (event) => {
  // In the future we can generate this list with a simple script (looking at video-list.json)
  const assetsToCache = [
    '/',
    '/index.html',
    '/dist/js/index.js',
    '/api/video-list.json',
    '/favicon.svg',
  ];

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
 * @param {Event} event Featch event.
 */
const fetchHandler = async (event) => {
  const getResponse = async () => {
    const openedCache = await caches.open(SW_CACHE_NAME);

    const cacheResponse = await openedCache.match(event.request);
    if (cacheResponse) return cacheResponse;

    const videoResponse = await maybeGetVideoResponse(event);
    if (videoResponse) return videoResponse;

    return fetch(event.request);
  };
  event.respondWith(getResponse());
};

/* eslint-disable no-restricted-globals */
self.addEventListener('install', precacheAssets);
self.addEventListener('fetch', fetchHandler);
/* eslint-enable no-restricted-globals */
