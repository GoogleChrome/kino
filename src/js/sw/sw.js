import { SW_CACHE_NAME, STORAGE_SCHEMA } from '../constants';
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
      const index = store.index('offset');
      const cursor = index.openCursor();

      cursor.onsuccess = (e) => {
        const newCursor = e.target.result;
        if (newCursor) {
          const dataObject = newCursor.value;
          const previousDataLength = dataObject.offset - dataObject.size;

          if (rangeFrom < dataObject.offset && rangeTo > previousDataLength) {
            const overlapFrom = Math.max(rangeFrom, previousDataLength);
            const overlapTo = Math.min(rangeTo, dataObject.offset - 1);

            if (overlapTo - overlapFrom !== dataObject.size - 1) {
              const sliceBufferFrom = overlapFrom - previousDataLength;
              const sliceBufferTo = overlapTo - previousDataLength + 1;

              const bufferSlice = new Uint8Array(
                newCursor.value.data.slice(sliceBufferFrom, sliceBufferTo),
              );
              controller.enqueue(bufferSlice);
            } else {
              controller.enqueue(newCursor.value.data);
            }
          }
          newCursor.continue();
        } else {
          controller.close();
        }
      };
      cursor.onerror = () => controller.close();
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
 * @returns {Response|null} Response stream or null.
 */
const maybeGetVideoResponse = async (event) => {
  const db = await getIDBConnection();
  const metaEntry = await db.meta.get(event.request.url);

  return metaEntry.done ? getResponseStream(event.request, db, metaEntry) : null;
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

  event.waitUntil(
    caches.open(SW_CACHE_NAME).then((cache) => cache.addAll(assetsToCache)),
  );
};

/**
 * The main fetch handler.
 *
 * @param {Event} event Featch event.
 */
const fetchHandler = (event) => {
  event.respondWith(
    caches.open(SW_CACHE_NAME)
      .then(async (cache) => cache.match(event.request).then(async (response) => {
        if (response) return response;

        const videoResponse = await maybeGetVideoResponse(event);
        if (videoResponse) return videoResponse;

        return fetch(event.request);
      })),
  );
};

/* eslint-disable no-restricted-globals */
self.addEventListener('install', precacheAssets);
self.addEventListener('fetch', fetchHandler);
/* eslint-enable no-restricted-globals */
