import getIDBConnection from '../modules/IDBConnection.module';

const style = `
<style>
    :host,
    :host > * {
        display: none;
    }
    :host( :not( [state="not-initialized"] ) ) {
        display: block;
    }
    :host( [state="ready"] ) .ready {
        display: block;
    }
    :host( [state="partial"] ) .partial {
        display: block;
        position: relative;
        /*transform: translate(-1px, -1px);*/
    }
    :host( [state="partial"] ) .partial .resume {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-40%, -50%);
    }
    :host( [state="done"] ) .done {
        display: block;
    }
    :host( [state="done"] ) button .delete {
        display: none;
        cursor: pointer;
    }
    :host( [state="done"] ) button:hover .delete {
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
    return ['state', 'progress'];
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

  clickHandler() {
    if (this.state === 'done') {
      this.removeFromIDB();
    } else {
      this.download();
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
   *
   * @returns {object} Last chunk object that was generated for IDB.
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

    const processChunk = ({ done, value }) => {
      offset += value ? value.length : 0;
      index += 1;

      const chunk = {
        data: value,
        offset,
        index,
        done,
        ...commonChunkData,
      };

      /**
       * Triggers the `progress` setter, which reflects to the `progress` attribute
       * and the `<progress>` element.
       */
      this.progress = chunk.offset / chunk.sizeInBytes;

      /**
       * Invoke the actual logic that stores received chunk data in IDB.
       */
      this.storeVideoChunk(chunk);

      return chunk;
    };

    let streamChunk;
    let videoChunk;

    do {
      /* eslint-disable no-await-in-loop */
      // Await in loop is OK. The processing is sequential and can't be parallelized.
      streamChunk = await reader.read();
      /* eslint-eanble no-await-in-loop */

      videoChunk = processChunk(streamChunk);
    } while (streamChunk && !streamChunk.done);

    return videoChunk;
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
   */
  async storeVideoChunk({
    data, offset, done, mime, sizeInBytes, index, url,
  }) {
    const db = await getIDBConnection();
    const size = data ? data.length : 0;

    db.meta.put({
      offset, sizeInBytes, done, mime, url,
    });

    if (data) {
      db.data.put({
        offset, size, data, index, url,
      });
    }
    if (done) this.state = 'done';
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
   * Retrieves the last stored data chunk for the current video.
   *
   * @returns {Promise} Promise that resolves with the last chunk data.
   */
  async getLastChunk() {
    const db = await getIDBConnection();
    const rawDb = db.unwrap();
    const transaction = rawDb.transaction([db.data.name], 'readonly');
    const store = transaction.objectStore(db.data.name);
    const index = store.index('index');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');

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
    const db = await getIDBConnection();
    const rawDb = db.unwrap();
    const transaction = rawDb.transaction([db.data.name], 'readonly');
    const store = transaction.objectStore(db.data.name);
    const index = store.index('index');

    return new Promise((resolve, reject) => {
      const request = index.openCursor();

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
            </button>
            <button class="partial">
              <progress-ring stroke="2" radius="14" progress="0"></progress-ring>
              <img class="resume" src="/download-resume.svg" alt="Resume" />
            </button>
            <button class="done">
              <img class="ok" src="/download-done.svg" alt="Done" />
              <img class="delete" src="/download-delete.svg" alt="Delete" title="Delete the video from cache." />
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
      // this._buttonEl.innerHTML = 'Resume Download';
    } else {
      this.state = 'ready';
    }
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
