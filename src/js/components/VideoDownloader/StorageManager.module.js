import '../../typedefs';
import getIDBConnection from '../../modules/IDBConnection.module';

export default class {
  /**
   * Instantiates the storage manager.
   *
   * @param {VideoDownloader} videoDownloader The associated video downloader object.
   */
  constructor(videoDownloader) {
    this.done = false;

    this.onerror = () => {};
    this.onprogress = () => {};
    this.ondone = () => {};

    this.internal = {
      videoDownloader,
    };
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
   *
   * @returns {Promise} Promise that resolves when the write operations are complete.
   */
  async storeChunk(fileMeta, fileChunk, isDone) {
    if (this.cancelled) return true;

    const db = await getIDBConnection();
    const videoMeta = {
      done: isDone,
      videoId: this.internal.videoDownloader.getId(),
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
          const percentage = this.internal.videoDownloader.getProgress();
          this.onprogress(percentage);

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
