/**
 * Copyright 2021 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint no-restricted-globals: 1 */

import {
  SW_CACHE_NAME,
  SW_CACHE_FORMAT,
  APP_SHELL_URL,
  STORAGE_SCHEMA,
  IDB_CHUNK_INDEX,
  MEDIA_SERVER_ORIGIN,
} from '../constants';

import getIDBConnection from '../classes/IDBConnection';
import assetsToCache from './cache';
import BackgroundFetch from '../classes/BackgroundFetch';
import DownloadManager from '../classes/DownloadManager';
import StorageManager from '../classes/StorageManager';

/**
 * Respond to a request to fetch offline video file and construct a response stream.
 *
 * Includes support for `Range` requests.
 *
 * @param {Request}     request    Request object.
 * @param {IDBDatabase} db         IDBDatabase instance.
 * @param {FileMeta}    fileMeta   File meta object.
 * @returns {Response} Response object.
 */
const getResponseStream = (request, db, fileMeta) => {
  const rangeRequest = request.headers.get('range') || '';
  const byteRanges = rangeRequest.match(/bytes=(?<from>[0-9]+)?-(?<to>[0-9]+)?/);
  const rangeFrom = Number(byteRanges?.groups?.from || 0);
  const rangeTo = Number(byteRanges?.groups?.to || fileMeta.bytesTotal - 1);

  /**
   * As the data is pulled from the stream, we need to keep
   * track of the current pointer in the range of data
   * requested.
   */
  let currentBytePointer = rangeFrom;

  const stream = new ReadableStream({
    pull(controller) {
      const rawIDB = db.unwrap();
      const transaction = rawIDB.transaction(STORAGE_SCHEMA.data.name, 'readonly');
      const store = transaction.objectStore(STORAGE_SCHEMA.data.name);

      /**
       * This returns a cursor to all records within the following range:
       *
       * record.rangeStart <= currentBytePointer
       *
       * Then we iterate this collection in the reverse direction and grab the
       * first record and enqueue its data partially or in whole depending on
       * the originally requested byte range (`rangeFrom`, `rangeTo`).
       */
      const allEntriesForUrlRange = IDBKeyRange.bound(
        [request.url, -Infinity, -Infinity],
        [request.url, currentBytePointer, Infinity],
      );

      const index = store.index(IDB_CHUNK_INDEX);
      const cursor = index.openCursor(allEntriesForUrlRange, 'prev');

      /**
       * If the result of calling pull() is a promise, pull() will not be called again
       * until said promise fulfills. If the promise rejects, the stream will become errored.
       *
       * @see https://web.dev/streams/
       */
      return new Promise((resolve) => {
        cursor.onerror = controller.close;
        cursor.onsuccess = (e) => {
          if (e.target.result) {
            const dataChunk = e.target.result.value;
            const needsSlice = dataChunk.rangeStart < rangeFrom || dataChunk.rangeEnd > rangeTo;
            const outOfBounds = dataChunk.rangeEnd < currentBytePointer;

            if (outOfBounds) {
              controller.close();
            } else if (!needsSlice) {
              /**
               * No slicing needed, enqueue the whole data object.
               */
              controller.enqueue(dataChunk.data);
              currentBytePointer += dataChunk.data.length;
            } else {
              /**
               * The requested range only partially overlaps the current chunk range.
               * We need to slice the buffer and return only the requested portion of data.
               */
              const sliceBufferFrom = Math.max(0, rangeFrom - dataChunk.rangeStart);
              const sliceBufferTo = Math.min(
                dataChunk.rangeEnd - dataChunk.rangeStart + 1,
                rangeTo - dataChunk.rangeStart + 1,
              );
              const bufferSlice = new Uint8Array(
                dataChunk.data.slice(sliceBufferFrom, sliceBufferTo),
              );
              controller.enqueue(bufferSlice);
              currentBytePointer += bufferSlice.length;
            }
          } else {
            controller.close();
          }

          resolve();
        };
      });
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
  event.waitUntil(
    caches.open(SW_CACHE_NAME).then((cache) => {
      cache.addAll(assetsToCache).then(self.skipWaiting);
    }),
  );
};

/**
 * Clears old precached data.
 *
 * @param {Event} event Activate event.
 */
const clearOldCaches = (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        /**
         * If the cache name matches the cache format this SW has under its control
         * and if the cache name is different from the current cache name,
         * then delete that cache as obsolete.
         */
        const shouldDelete = SW_CACHE_FORMAT.test(cacheName) && cacheName !== SW_CACHE_NAME;
        return shouldDelete ? caches.delete(cacheName) : true;
      }),
    )),
  );
};

/**
 * The main fetch handler.
 *
 * @param {FetchEvent} event Fetch event.
 */
const fetchHandler = async (event) => {
  const getResponse = async () => {
    const request = event.request.destination === 'document' ? APP_SHELL_URL : event.request;
    const openedCache = await caches.open(SW_CACHE_NAME);
    const cacheResponse = await openedCache.match(request);

    if (cacheResponse) return cacheResponse;

    if (event.request.url.indexOf(MEDIA_SERVER_ORIGIN) === 0) {
      const videoResponse = await maybeGetVideoResponse(event);
      if (videoResponse) return videoResponse;
    }

    return fetch(event.request);
  };
  event.respondWith(getResponse());
};

self.addEventListener('install', precacheAssets);
self.addEventListener('activate', clearOldCaches);
self.addEventListener('fetch', fetchHandler);

if ('BackgroundFetchManager' in self) {
  /**
   * When Background Fetch API is used to download a file
   * for offline viewing, Channel Messaging API is used
   * to signal that a video is fully saved to IDB back
   * to the UI.
   *
   * Because the operation is initiated from the UI, the
   * `MessageChannel` instance is created there and one of
   * the newly created channel ports is then sent to the
   * service worker and stored in this variable.
   *
   * @type {MessagePort}
   */
  let messageChannelPort;

  self.addEventListener(
    'message',
    (event) => {
      if (event.data.type === 'channel-port') {
        [messageChannelPort] = event.ports;
      }
    },
  );

  const bgFetchHandler = async (e) => {
    /** @type {BackgroundFetchRegistration} */
    const bgFetchRegistration = e.registration;
    const records = await bgFetchRegistration.matchAll();
    const urls = records.map((record) => record.request.url);

    if (urls.length === 0) {
      return;
    }

    const responsePromises = records.map((record) => record.responseReady);
    const responses = await Promise.all(responsePromises);
    const bgFetch = new BackgroundFetch();

    bgFetch.fromRegistration(bgFetchRegistration);

    /**
     * The `DownloadManager` reads binary data from passed response objects
     * and routes the data to the `StorageManager` that saves it along with any
     * metadata to IndexedDB.
     */
    const downloadManager = new DownloadManager(bgFetch.videoId);
    const storageManager = new StorageManager(bgFetch.videoId);
    const boundStoreChunkHandler = storageManager.storeChunk.bind(storageManager);

    await downloadManager.prepareFileMeta(urls);
    downloadManager.attachFlushHandler(boundStoreChunkHandler);
    downloadManager.attachFlushHandler((fileMeta, fileChunk, isDone) => {
      // If we have a message channel open, signal back to the UI when we're done.
      if (isDone && messageChannelPort) {
        messageChannelPort.postMessage('done');
      }
    });

    // Start the download, i.e. pump binary data out of the response objects.
    downloadManager.run(responses);
  };
  self.addEventListener('backgroundfetchsuccess', bgFetchHandler);
}
