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
   * @param {FileChunk}  fileChunk  File chunk to be stored.
   * @param {boolean}    isDone     Is this the last downloaded chunk.
   *
   * @returns {Promise} Promise that resolves when the write operations are complete.
   */
  async storeChunk(fileChunk, isDone) {
    const videoMeta = this.internal.videoDownloader.getMeta();
    const db = await getIDBConnection();

    videoMeta.done = isDone;

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

    return new Promise((resolve, reject) => {
      Promise.all([metaWritePromise, dataWritePromise])
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
