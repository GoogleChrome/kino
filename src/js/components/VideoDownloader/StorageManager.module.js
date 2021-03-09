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
   * @param {FileMeta}   fileMeta   File meta entry upadte to be stored.
   * @param {FileChunk}  fileChunk  File chunk to be stored.
   * @param {boolean}    isDone     Is this the last downloaded chunk.
   *
   * @returns {Promise} Promise that resolves when the write operations are complete.
   */
  async storeChunk(fileMeta, fileChunk, isDone) {
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
