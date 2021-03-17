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

    const metaWritePromise = new Promise((resolve, reject) => {
      const metaPutOperation = db.meta.put(videoMeta);
      metaPutOperation.onsuccess = resolve;
      metaPutOperation.onerror = reject;
    });

    const dataWritePromise = new Promise((resolve, reject) => {
      const dataPutOperation = db.data.put(fileChunk);

      dataPutOperation.onsuccess = resolve;
      dataPutOperation.onerror = reject;
    });

    const fileWritePromise = new Promise((resolve, reject) => {
      const dataPutOperation = db.file.put(fileMeta);

      dataPutOperation.onsuccess = resolve;
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
