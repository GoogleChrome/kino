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
import getFileMetaForDownload from '../utils/getFileMetaForDownload';
import rewriteURL from '../utils/rewriteURL';

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
   * @param {string} videoId Video ID of the media to be downloaded.
   */
  constructor(videoId) {
    this.videoId = videoId;
    this.paused = false;
    this.cancelled = false;

    /** @type {Response[]} */
    this.responses = [];

    /** @type {DownloadFlushHandler[]} */
    this.flushHandlers = [];

    this.onfilemeta = () => {};

    this.bufferSetup();
  }

  /**
   * Flushes the downloaded data to any handlers.
   *
   * @param {FileMeta}  fileMeta  File meta.
   * @param {FileChunk} fileChunk File chunk.
   * @param {boolean}   isDone    Is this the last file chunk.
   */
  flush(fileMeta, fileChunk, isDone) {
    this.flushHandlers.forEach((handler) => {
      handler(fileMeta, fileChunk, isDone);
    });
  }

  /**
   * Attaches a handler to receive downloaded data.
   *
   * @param {DownloadFlushHandler} flushHandler Flush handler.
   */
  attachFlushHandler(flushHandler) {
    this.flushHandlers.push(flushHandler);
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
     * IDB put operations have a lot of overhead, so it's impractical for us to
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
    this.flush(fileMeta, fileChunk, this.done);
  }

  /**
   * Downloads the first file that is not fully downloaded.
   */
  async downloadFile() {
    const { bytesDownloaded, url } = this.currentFileMeta;

    // Attempts to find an existing response object for the current URL
    // before fetching the file from the network.
    let response = this.responses.reduce(
      (prev, current) => (current.url === url ? current : prev),
      null,
    );

    /**
     * Some URLs we want to download have their offline versions.
     *
     * If the current URL is one of those, we want to make sure not to
     * use any existing response for the original URL.
     */
    const rewrittenUrl = rewriteURL(this.videoId, url, 'online', 'offline');

    if (!response || url !== rewrittenUrl) {
      const fetchOpts = {};

      if (bytesDownloaded) {
        fetchOpts.headers = {
          Range: `bytes=${bytesDownloaded}-`,
        };
      }

      try {
        response = await fetch(rewrittenUrl, fetchOpts);
      } catch (e) {
        this.warning(`Pausing the download of ${rewrittenUrl} due to network error.`);
        this.forcePause();
        return;
      }
    }

    const reader = response.body.getReader();
    const mimeType = response.headers.get('Content-Type') || getMimeByURL(url);
    const fileLength = response.headers.has('Content-Range')
      ? Number(response.headers.get('Content-Range').replace(/^[^/]\/(.*)$/, '$1'))
      : Number(response.headers.get('Content-Length'));

    // If this is a full response, throw away any bytes downloaded earlier.
    if (!response.headers.has('Content-Range')) {
      this.currentFileMeta.bytesDownloaded = 0;
    }

    this.currentFileMeta.mimeType = mimeType;
    this.currentFileMeta.bytesTotal = fileLength > 0 ? fileLength : null;

    let dataChunk;
    do {
      try {
        /* eslint-disable-next-line no-await-in-loop */
        dataChunk = await reader.read();
      } catch (e) {
        this.warning(`Pausing the download of ${rewrittenUrl} due to network error.`);
        this.forcePause();
      }

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
   * Pauses the current download and forces the associated
   * `VideoDownloader` instance to render the paused UI, too.
   */
  forcePause() {
    this.pause();

    if (document) {
      const pauseEvent = new CustomEvent('pausedownload', { detail: this.videoId });
      document.dispatchEvent(pauseEvent);
    }
  }

  /**
   * Handle a warning message.
   *
   * @todo Update to expose the warning to the user.
   * @param {string} message Error message.
   */
  warning(message) {
    /* eslint-disable-next-line no-console */
    console.warn(message);
  }

  /**
   * Cancels the download.
   */
  cancel() {
    this.cancelled = true;
  }

  /**
   * Generates a list of URLs to be downloaded and turns them into
   * a list of FileMeta objects that track download properties
   * for each of the files.
   *
   * @param {string[]} [urls]       Optional list of URLs to be downloaded.
   * @returns {Promise<FileMeta[]>} Promise resolving with FileMeta objects prepared for download.
   */
  async prepareFileMeta(urls = null) {
    this.files = await getFileMetaForDownload(this.videoId, urls);
    return this.files;
  }

  /**
   * Starts downloading files.
   *
   * @param {Response[]} [responses] Already prepared responses for (some of) the donwloaded
   *                                 files, e.g. produced by Background Fetch API.
   */
  async run(responses = []) {
    this.paused = false;
    this.responses = responses;

    this.maybePrepareNextFile();

    while (!this.done && !this.paused && !this.cancelled && this.currentFileMeta) {
      /* eslint-disable-next-line no-await-in-loop */
      await this.downloadFile();
    }
  }
}
