/**
 * Type definitions.
 */
import '../typedefs';

/**
 * Classes.
 */
import FixedBuffer from './FixedBuffer';

/**
 * Utils.
 */
import getMimeByURL from '../utils/getMimeByURL';

/**
 * The DownloadManager is responsible for downloading videos from the network.
 *
 * 1) It accepts a `VideoDownloader` instance and retrieve the list of files to be downloaded.
 * 2) It creates a fixed 2 MB ArrayBuffer.
 * 3) It downloads the queued files one by one.
 * 4) When the file is downloaded or when the ArrayBuffer is full, it flushes the buffer data.
 * 5) This is done by calling `onflush` containing the buffer data.
 * 6) Outside code can use `onflush` to be notified of the downloaded data. In our case,
 *    we use a custom `StorageManager` instance to observe the flushes and to store
 *    the data inside IndexedDB.
 */
export default class DownloadManager {
  /**
   * Instantiates the download manager.
   *
   * @param {VideoDownloader} videoDownloader The associated video downloader object.
   */
  constructor(videoDownloader) {
    this.files = videoDownloader.internal.files || [];
    this.paused = false;
    this.cancelled = false;

    this.internal = {
      videoDownloader,
    };

    this.onflush = () => {};

    this.maybePrepareNextFile();
    this.bufferSetup();
  }

  /**
   * Sets the `currentFileMeta` to the first incomplete download.
   * Also sets the `done` property to indicate if all downloads are completed.
   */
  maybePrepareNextFile() {
    const firstIncompleteDownload = this.files.find(
      (fileMeta) => fileMeta.done === false,
    );
    this.currentFileMeta = firstIncompleteDownload;
    this.done = firstIncompleteDownload === undefined;
  }

  /**
   * Sets up a fixed buffer that emits reasonably sized downloaded chunks of data.
   */
  bufferSetup() {
    /**
     * IDB put operations have a lot of overhead, so it's impractical for us to store
     * a data chunk every time our reader has more data, because those chunks
     * usually are pretty small and generate thousands of IDB data entries.
     *
     * Instead we use a fixed 2 MB buffer that we continuously fill with data. Once it
     * overflows, it automatically flushes and its internal pointer is reset.
     *
     * We only write to IDB when such a flush occurs.
     */
    const fixedBufferSizeInBytes = 2 * 1000 * 1000; // Store 2 MB chunks.
    this.buffer = new FixedBuffer(fixedBufferSizeInBytes);
    this.buffer.onflush = this.bufferFlushed.bind(this);
  }

  /**
   * When the fixed buffer is flushed, update the current file meta
   * information appropriately and run the `onflush` handler.
   *
   * @param {Uint8Array} data Downloaded data.
   * @param {object}     opts Any custom options pushed through the buffer.
   */
  bufferFlushed(data, opts = {}) {
    const fileMeta = this.currentFileMeta;
    const fileChunk = {
      url: fileMeta.url,
      rangeStart: fileMeta.bytesDownloaded,
      rangeEnd: fileMeta.bytesDownloaded + data.length - 1,
      data,
    };

    fileMeta.bytesDownloaded += data.length;
    if (opts.done) {
      fileMeta.bytesTotal = fileMeta.bytesDownloaded;
      fileMeta.done = true;
    }
    this.maybePrepareNextFile();
    this.onflush(fileMeta, fileChunk, this.done);
  }

  /**
   * Downloads the first file that is not fully downloaded.
   */
  async downloadFile() {
    const { bytesDownloaded, url, downloadUrl } = this.currentFileMeta;
    const fetchOpts = {};

    if (bytesDownloaded) {
      fetchOpts.headers = {
        Range: `bytes=${bytesDownloaded}-`,
      };
    }

    const response = await fetch(downloadUrl, fetchOpts);
    const reader = response.body.getReader();
    const mimeType = response.headers.get('Content-Type') || getMimeByURL(url);
    const fileLength = response.headers.has('Content-Range')
      ? Number(response.headers.get('Content-Range').replace(/^[^/]\/(.*)$/, '$1'))
      : Number(response.headers.get('Content-Length'));

    this.currentFileMeta.mimeType = mimeType;
    this.currentFileMeta.bytesTotal = fileLength > 0 ? fileLength : null;

    let dataChunk;
    do {
      /* eslint-disable-next-line no-await-in-loop */
      dataChunk = await reader.read();

      if (!dataChunk.done) this.buffer.add(dataChunk.value);
    } while (dataChunk && !dataChunk.done && !this.paused);

    const flushOpts = dataChunk.done ? { done: true } : {};
    this.buffer.flush(flushOpts);
  }

  /**
   * Pauses the download.
   */
  pause() {
    this.paused = true;
  }

  /**
   * Cancels the download.
   */
  cancel() {
    this.cancelled = true;
  }

  /**
   * Starts downloading files.
   */
  async run() {
    this.paused = false;
    while (!this.done && !this.paused && !this.cancelled && this.currentFileMeta) {
      /* eslint-disable-next-line no-await-in-loop */
      await this.downloadFile();
    }
  }
}
