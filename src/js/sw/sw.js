import { SW_CACHE_NAME, STORAGE_SCHEMA } from '../constants';
import IDBConnection from '../modules/IDBConnection.module';

/**
 * Respond to a request to fetch offline video and contruct a response stream.
 *
 * @todo Support byte range requests properly.
 *
 * Currently the whole video is pushed to the stream and `206 Partial Content` is not sent.
 *
 * @param {IDBConnection} db  IDBConnection instance.
 * @param {object} metaEntry  Video metadata from the IDB.
 * @param {number} streamFrom To support byte range requests. WIP.
 * @param {number} streamTo   To support byte range requests. WIP.
 *
 * @returns {Response} Response object.
 */
const getResponseStream = (db, metaEntry, streamFrom = null, streamTo = null) => {
  /* eslint-disable no-unused-vars */
  streamFrom = streamFrom || 0;
  streamTo = streamTo || metaEntry.sizeInBytes;
  /* eslint-enable no-unused-vars */

  const stream = new ReadableStream({
    async start(controller) {
      const rawIDB = db.unwrap();
      const transaction = rawIDB.transaction(STORAGE_SCHEMA.data.name, 'readonly');
      const store = transaction.objectStore(STORAGE_SCHEMA.data.name);
      const index = store.index('offset');
      const request = index.openCursor();

      request.onsuccess = (e) => {
        const cursor = e.target.result;

        if (cursor) {
          controller.enqueue(cursor.value.data);
          cursor.continue();
        } else {
          controller.close();
        }
      };
      request.onerror = () => controller.close();
    },
  });

  const response = new Response(stream, {
    headers: {
      'Content-Type': metaEntry.mime || 'application/octet-stream',
      'Content-Length': metaEntry.sizeInBytes,
    },
  });
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
  const db = await IDBConnection.getConnection();
  const metaEntry = await db.meta.get(event.request.url);

  return metaEntry.done ? getResponseStream(db, metaEntry) : null;
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
