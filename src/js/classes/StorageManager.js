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

import '../typedefs';
import getProgress from '../utils/getProgress';
import getIDBConnection from './IDBConnection';

/**
 * Stores video meta, data and file chunks in IndexedDB and invokes
 * `onprogress` and `ondone` callbacks, allowing for the UI to be able
 * to reliably reflect the download process progress.
 *
 * Please see the `DownloadManager` class, too, which handles the actual
 * video data download from network.
 */
export default class {
  /**
   * Instantiates the storage manager.
   *
   * @param {string}     videoId       Video ID to identify stored data.
   * @param {object}     opts          Optional settings.
   * @param {FileMeta[]} opts.fileMeta File meta objects to observe progress for.
   */
  constructor(videoId, opts = {}) {
    this.done = false;
    this.videoId = videoId;
    this.fileMeta = opts.fileMeta || [];

    this.onerror = () => {};
    this.onprogress = () => {};
    this.ondone = () => {};
  }

  /**
   * Cancels all storage operations.
   */
  cancel() {
    this.cancelled = true;
  }

  /**
   * Receives the updated file meta object and a file chunk and updates the
   * database with new information.
   *
   * When the data is committed to the database, recalculates the progress
   * percentage and invokes the `onprogress` handlers.
   *
   * If the `isDone` argument is `true`, the storage manager will invoke the `ondone`
   * handler once all data pieces are written to IDB.
   *
   * @param {FileMeta}   fileMeta   File meta entry update to be stored.
   * @param {FileChunk}  fileChunk  File chunk to be stored.
   * @param {boolean}    isDone     Is this the last downloaded chunk?
   * @returns {Promise} Promise that resolves when the write operations are complete.
   */
  async storeChunk(fileMeta, fileChunk, isDone) {
    if (this.cancelled) return true;

    const db = await getIDBConnection();
    const videoMeta = {
      done: isDone,
      videoId: this.videoId,
      timestamp: Date.now(),
    };
    const txAbortHandler = (e) => {
      const { error } = e.target;
      if (error.name === 'QuotaExceededError') {
        this.cancel();

        /**
         * @todo Display an alert or snackbar warning instead of console.
         */

        // eslint-disable-next-line no-console
        console.log(`[StorageManager] Quota exceeded. Unable to store more data in '${e.target.objectStoreNames?.[0]}' store.`);
      }
      this.onerror(error);
    };

    const metaWritePromise = new Promise((resolve, reject) => {
      const [transaction, metaPutOperation] = db.meta.put(videoMeta);

      transaction.onabort = txAbortHandler;
      metaPutOperation.onsuccess = () => {
        db.dispatchDataChangedEvent();
        resolve();
      };
      metaPutOperation.onerror = reject;
    });

    const dataWritePromise = new Promise((resolve, reject) => {
      const [transaction, dataPutOperation] = db.data.put(fileChunk);

      transaction.onabort = txAbortHandler;
      dataPutOperation.onsuccess = () => {
        db.dispatchDataChangedEvent();
        resolve();
      };
      dataPutOperation.onerror = reject;
    });

    const fileWritePromise = new Promise((resolve, reject) => {
      const [transaction, dataPutOperation] = db.file.put(fileMeta);

      transaction.onabort = txAbortHandler;
      dataPutOperation.onsuccess = () => {
        db.dispatchDataChangedEvent();
        resolve();
      };
      dataPutOperation.onerror = reject;
    });

    return new Promise((resolve, reject) => {
      Promise.all([metaWritePromise, dataWritePromise, fileWritePromise])
        .then(() => {
          if (this.fileMeta.length > 0) {
            this.onprogress(getProgress(this.fileMeta));
          }

          if (isDone) {
            this.done = true;
            this.ondone();
          }
          resolve();
        })
        .catch(reject);
    });
  }
}
