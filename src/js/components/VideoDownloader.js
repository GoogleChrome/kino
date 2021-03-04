import FixedBuffer from '../modules/FixedBuffer.module';
import getIDBConnection from '../modules/IDBConnection.module';
import { IDB_CHUNK_INDEX } from '../constants';

const style = `
<style>
    :host,
    :host > * {
        display: none;
    }
    .expanded {
      display: none;
    }
    span.expanded {
      margin-left: 1rem;
    }
    button.cancel {
        border-color: #FF8383 !important;
    }
    :host( [expanded="true"] ) .expanded {
        display: inline-block;
    }
    :host( [expanded="true"] ) {
      display: inline-block;
    }
    :host( not( [expanded="true"] ) ) .expanded {
      display: none;
    }
    :host( [expanded="true"] ) button {
      justify-content: center;
      align-items: center;
      border: 1px solid var(--accent);
      color: var(--accent);
      font-size: 0.8rem;
      font-weight: bold;
      letter-spacing: 0.085em;
      border-radius: 5px;
      padding: 0.5rem 1rem 0.5rem 1rem;
      text-transform: uppercase;
      cursor: pointer;
      background: transparent;
    }
    :host( :not( [state="not-initialized"] ) ) {
        display: inline-block;
    }
    :host( [state="ready"] ) .ready {
        display: flex;
        align-items: center;
    }
    :host( [state="partial"] ) .partial {
        display: flex;
        position: relative;
    }
    .progress {
        position: relative;
        display: inline-block;
    }
    :host( [state="partial"][downloading="true"] ) .cancel {
        display: none;
    }
    :host( [state="partial"][downloading="false"] ) .cancel {
        display: block;
        position: absolute;
        bottom: 0;
        background: #FFF;
        padding: 0.5rem;
        border-radius: 5px;
        left: 50%;
        transform: translate(-50%, 0);
        color: #FF8383;
        font-size: 0.7rem;
        font-weight: bold;
        line-height: initial;
        cursor: pointer;
        text-transform: uppercase;
    }
    :host( [expanded="true"][state="partial"][downloading="false"] ) .cancel {
        right: 0;
        left: initial;
        bottom: initial;
        transform: translate(110%, 0);
    }
    :host( [state="partial"][downloading="false"] ) .resume:not(.expanded) {
        display: block;
    }
    :host( [state="partial"][downloading="false"] ) .pause {
        display: none;
    }
    :host( [state="partial"][downloading="true"] ) .resume:not(.expanded) {
        display: none;
    }
    :host( [state="partial"][downloading="true"] ) .pause:not(.expanded) {
        display: block;
    }
    :host( [state="partial"][downloading="true"][expanded="true"] ) .resume {
        display: none;
    }
    :host( [state="partial"] ) .partial img.resume,
    :host( [state="partial"] ) .partial img.pause {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    :host( [state="partial"] ) .partial img.resume {
        transform: translate(-40%, -50%);
    }
    :host( [state="done"] ) .done {
        display: flex;
    }
    :host( [state="done"] ) button .delete {
        display: none;
        cursor: pointer;
        color: #FF8383;
    }
    :host( [state="done"] ) button:hover {
        border-color: #FF8383;
    }
    :host( [state="done"]:not( [expanded="true"] ) ) button:hover .delete:not(.expanded) {
        display: block;
    }
    :host( [state="done"][expanded="true"] ) button:hover .delete {
        display: block;
    }

    :host( [state="done"] ) button:hover .ok {
        display: none;
    }
    button {
        cursor: pointer;
        padding: 0;
        background: transparent;
        border: 0;
        line-height: 0;
    }
    :host( [state="ready"] ) button:hover {
        filter: brightness(95%);
    }
</style>
`;

export default class extends HTMLElement {
  static get observedAttributes() {
    return ['state', 'progress', 'downloading'];
  }

  constructor() {
    super();

    // Attach Shadow DOM.
    this._root = this.attachShadow({ mode: 'open' });
  }

  /**
   * After the components is attached to DOM, set up some defaults.
   */
  connectedCallback() {
    if (!this.state) this.state = 'not-initialized';
  }

  /**
   * Reflected DOM Attributes.
   *
   * @returns {string} Components state string.
   */
  get state() {
    return this.getAttribute('state');
  }

  set state(state) {
    this.setAttribute('state', state);
    if (this.onStatusUpdate) {
      this.onStatusUpdate(state);
    }
  }

  get downloading() {
    return this.getAttribute('downloading') === 'true';
  }

  set downloading(downloading) {
    this.setAttribute('downloading', downloading);
  }

  get progress() {
    const progress = parseFloat(this.getAttribute('progress'));
    const clampedProgress = Math.min(Math.max(0, progress), 100);

    return clampedProgress;
  }

  set progress(progress) {
    const progressFloat = parseFloat(progress);
    const clampedProgress = Math.min(Math.max(0, progressFloat), 100);

    this.setAttribute('progress', clampedProgress);
  }

  /**
   * Observed attributes callbacks.
   *
   * @param {string} name  Attribute name.
   * @param {*}      old   Previous attribute value.
   * @param {*}      value Current attribute value.
   */
  attributeChangedCallback(name, old, value) {
    if (name === 'progress') {
      this._progressEl.setAttribute('progress', value);
    }
  }

  /**
   * Component logic.
   *
   * @param {object} videoData Video metadata object.
   * @param {string} cacheName Cache name.
   */
  init(videoData, cacheName = 'v1') {
    this._videoData = videoData;
    this._cacheName = cacheName;

    this._setDownloadState();
    this._renderUI();

    this._progressEl = this._root.querySelector('progress-ring');
    this._buttonEls = this._root.querySelectorAll('button');

    this._buttonEls.forEach((button) => {
      button.addEventListener('click', this.clickHandler.bind(this));
    });
  }

  clickHandler(e) {
    if (this.state === 'done') {
      this.removeFromIDB();
    } else if (e.target.className === 'cancel') {
      this.removeFromIDB();
    } else if (this.downloading === false) {
      this.download();
    } else {
      this.downloading = false;
    }
  }

  /**
   * Selects an appropriate video source for a video download.
   *
   * Fall back to the first source if none of the sources are identified
   * as potentially supported for playback.
   *
   * @returns {string} Video URL appropriate for download on this device.
   */
  getDownloadableURL() {
    const videoEl = document.createElement('video');
    let candidate = null;

    /* eslint-disable no-restricted-syntax, default-case */
    for (const source of this._videoData['video-sources']) {
      switch (videoEl.canPlayType(source.type)) {
        case 'probably': return source.src;
        case 'maybe': candidate = candidate || source.src;
      }
    }
    /* eslint-enable no-restricted-syntax */

    return candidate || this._videoData['video-sources'][0].src;
  }

  /**
   * Returns the thumbnail image URL.
   *
   * @returns {string} URL.
   */
  getPosterURL() {
    return this._videoData.thumbnail;
  }

  /**
   * Returns the subtitles URLs.
   *
   * @returns {string[]} URLs.
   */
  getSubtitlesUrls() {
    const subtitlesObjects = this._videoData['video-subtitles'] || [];
    const subtitlesUrls = subtitlesObjects.map((subObject) => subObject.src);

    return subtitlesUrls;
  }

  /**
   * Saves assets to the specified cache using Cache API.
   *
   * @param {string[]} urls Array of URLs to be saved to the cache.
   *
   * @returns {Promise} Resolves when the assets are stored in the cache.
   */
  async saveToCache(urls) {
    const cache = await caches.open(this._cacheName);
    return cache.addAll(urls);
  }

  /**
   * Downloads the current video and its assets to the cache and IDB.
   */
  async download() {
    const videoURL = this.getDownloadableURL();
    const posterURL = this.getPosterURL();
    const subtitlesURLs = this.getSubtitlesUrls();

    this.downloading = true;

    this.saveToCache([posterURL, ...subtitlesURLs]);
    this.saveToIDB(videoURL);
  }

  /**
   * Returns data used to download the video to IDB.
   *
   * @returns {object} Init data.
   */
  async initDownload() {
    const fetchOpts = {
      headers: {},
    };
    let firstIndex = 0;
    let firstOffset = 0;
    let videoSizeInBytes = null;

    /**
     * Support incomplete downloads.
     */
    if (this.state === 'partial' && this._videoData.meta) {
      const lastChunk = await this.getLastChunk();

      if (!lastChunk || !lastChunk.index) {
        this.state = 'ready';
        delete this._videoData.meta;
      } else {
        firstIndex = lastChunk.index + 1;
        firstOffset = this._videoData.meta.offset + 1;
        videoSizeInBytes = this._videoData.meta.sizeInBytes;

        fetchOpts.headers.Range = `bytes=${this._videoData.meta.offset}-`;
      }
    }

    return {
      firstIndex,
      firstOffset,
      videoSizeInBytes,
      fetchOpts,
    };
  }

  /**
   * Takes a video URL, downloads the video using a stream reader
   * and invokes `storeVideoChunk` to store individual video chunks in IndexedDB.
   *
   * @param {string} videoURL Video URL to be downloaded and saved to IDB.
   */
  async saveToIDB(videoURL) {
    const {
      firstIndex, firstOffset, videoSizeInBytes, fetchOpts,
    } = await this.initDownload();

    /**
     * Set the component state to `partial` to indicate that we've started the process.
     */
    this.state = 'partial';

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
     */
    const response = await fetch(videoURL, fetchOpts);
    const reader = response.body.getReader();

    /**
     * Some common metadata to be passed together with every chunk of data.
     */
    const commonChunkData = {
      url: videoURL,
      mime: response.headers.get('Content-Type') || this.getVideoMimeByURL(videoURL),
      sizeInBytes: videoSizeInBytes || parseInt(response.headers.get('Content-Length'), 10) || 1,
    };

    let index = firstIndex;
    let offset = firstOffset;

    const processChunk = (data, done) => {
      offset += data.length;
      index += 1;

      const chunk = {
        data,
        offset,
        index,
        done,
        ...commonChunkData,
      };

      /**
       * Invoke the actual logic that stores received chunk data in IDB.
       */
      this.storeVideoChunk(chunk).then(() => {
        /**
         * Triggers the `progress` setter, which reflects to the `progress` attribute
         * and the `<progress>` element.
         */
        this.progress = chunk.offset / chunk.sizeInBytes;
        if (done) this.downloading = false;
      });

      return chunk;
    };

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
    const fixedBuffer = new FixedBuffer(fixedBufferSizeInBytes);
    fixedBuffer.onflush = (data, opts) => processChunk(data, opts.done || false);

    let fileChunk;
    do {
      /* eslint-disable no-await-in-loop */
      // Await in loop is OK. The processing is sequential and can't be parallelized.
      fileChunk = await reader.read();
      if (!fileChunk.done) fixedBuffer.add(fileChunk.value);
      /* eslint-eanble no-await-in-loop */
    } while (this.downloading && fileChunk && !fileChunk.done);

    const opts = fileChunk.done ? { done: true } : {};
    fixedBuffer.flush(opts);
  }

  /**
   * Generates the meta and data objects and stores them in the database.
   *
   * @param {object} chunk Chunk data.
   * @param {Uint8Array} chunk.data         Stored video bytes.
   * @param {number}     chunk.offset       Data offset from the beginning of the file.
   * @param {boolean}    chunk.done         Download done flag.
   * @param {string}     chunk.mime         File MIME type.
   * @param {number}     chunk.sizeInBytes  Filesize in bytes.
   * @param {number}     chunk.index        Chunk positional index in the file. Zero based.
   * @param {string}     chunk.url          File URL.
   *
   * @returns {Promise} Promise that resolves when chunk meta and all data is written.
   */
  async storeVideoChunk({
    data, offset, done, mime, sizeInBytes, index, url,
  }) {
    const db = await getIDBConnection();
    const size = data ? data.length : 0;

    const metaWritePromise = new Promise((resolve, reject) => {
      const metaEntry = {
        offset, sizeInBytes, done, mime, url,
      };
      const metaPutOperation = db.meta.put(metaEntry);
      metaPutOperation.onsuccess = () => {
        this._videoData.meta = metaEntry;
        resolve();
      };
      metaPutOperation.onerror = reject;
    });

    const dataWritePromise = new Promise((resolve, reject) => {
      const dataPutOperation = db.data.put({
        offset, size, data, index, url,
      });

      dataPutOperation.onsuccess = resolve;
      dataPutOperation.onerror = reject;
    });

    return new Promise((resolve, reject) => {
      Promise.all([metaWritePromise, dataWritePromise])
        .then(() => {
          if (done) this.state = 'done';
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Heuristic method to get video MIME type.
   *
   * @param {string} videoURL Video URL.
   *
   * @returns {string} Video MIME type string.
   */
  getVideoMimeByURL(videoURL) {
    const URLObject = new URL(videoURL);
    const extensionMatch = URLObject.pathname.match(/\.([a-z0-9]{3,4})$/);
    const extension = extensionMatch.length === 2 ? extensionMatch[1] : 'mp4';

    switch (extension) {
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'ogv': return 'video/ogg';
      case 'mpeg': return 'video/mpeg';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'ts': return 'video/mp2t';
      case '3gp': return 'video/3gpp';
      case '3g2': return 'video/3gpp2';
      case 'wmv': return 'video/x-ms-wmv';
      case 'flv': return 'video/x-flv';
      default: return `video/${extension}`;
    }
  }

  /**
   * Returns IDBIndex instance and a key range to iterate over a video URL.
   *
   * @param {string} url Video URL.
   *
   * @returns {Array} IDBIndex and IDBKeyRange objects.
   */
  async accessVideo(url) {
    const db = await getIDBConnection();
    const rawDb = db.unwrap();
    const transaction = rawDb.transaction([db.data.name], 'readonly');
    const store = transaction.objectStore(db.data.name);
    const index = store.index(IDB_CHUNK_INDEX);
    const range = IDBKeyRange.bound(
      [url, 0, 0],
      [url, Infinity, Infinity],
    );

    return [index, range];
  }

  /**
   * Retrieves the last stored data chunk for the current video.
   *
   * @returns {Promise} Promise that resolves with the last chunk data.
   */
  async getLastChunk() {
    const url = this.getDownloadableURL();
    const [index, range] = await this.accessVideo(url);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range, 'prev');

      request.onsuccess = (e) => resolve(e.target.result.value);
      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Iterate over all video chunks and return the total size of the stored video in bytes.
   *
   * @returns {Promise} Promise that resolves with the total video size in bytes.
   */
  async getTotalSize() {
    const url = this.getDownloadableURL();
    const [index, range] = this.accessVideo(url);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range);

      let totalSize = 0;

      request.onsuccess = (e) => {
        const cursor = e.target.result;

        if (cursor) {
          totalSize += cursor.value.size;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };
      request.onerror = (e) => reject(e);
    });
  }

  /**
   * Renders the UI.
   *
   * @returns {void}
   */
  _renderUI() {
    const templateElement = document.createElement('template');
    templateElement.innerHTML = `${style}
            <button class="ready">
              <img src="/download-circle.svg" alt="Download" />
              <span class="expanded">Make available offline</span>
            </button>
            <span class="partial">
              <button class="cancel" title="Cancel and remove">Cancel</button>
            </span>
            <button class="partial">
              <div class="progress">
                <progress-ring stroke="2" radius="13" progress="0"></progress-ring>
                <img class="resume" src="/download-resume.svg" alt="Resume" />
                <img class="pause" src="/download-pause.svg" alt="Pause" />
              </div>
              <span class="expanded pause">Pause download</span>
              <span class="expanded resume">Resume download</span>
            </button>
            <button class="done">
              <img class="ok" src="/download-done.svg" alt="Done" />
              <img class="delete" src="/download-delete.svg" alt="Delete" title="Delete the video from cache." />
              <span class="expanded ok">Downloaded</span>
              <span class="expanded delete">Remove video</span>
            </button>`;

    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this._root.appendChild(ui);
  }

  /**
   * Retrieve information about video download state and update
   * component's `state` and `progress` attribute values.
   */
  async _setDownloadState() {
    const db = await getIDBConnection();
    const url = this.getDownloadableURL();
    const videoMeta = await db.meta.get(url);

    this._videoData.meta = videoMeta;

    if (videoMeta.done) {
      this.state = 'done';
    } else if (videoMeta.offset > 0) {
      this.state = 'partial';
      this.progress = videoMeta.offset / videoMeta.sizeInBytes;
    } else {
      this.state = 'ready';
    }
    this.downloading = false;
  }

  /**
   * Removes the current video from IDB.
   */
  async removeFromIDB() {
    const db = await getIDBConnection();
    const url = this.getDownloadableURL();

    this.state = 'removing';
    await db.removeVideoByUrl(url);
    this.state = 'ready';
  }
}
