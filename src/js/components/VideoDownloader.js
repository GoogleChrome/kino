import IDBConnection from '../modules/IDBConnection.module';

const style = `
<style>
    :host,
    :host * {
        display: none;
    }
    :host( :not( [state="not-initialized"] ) ) {
        display: block;
    }
    :host( [state="ready"] ) button,
    :host( [state="partial"] ) button {
        display: block;
    }
    :host( [state="partial"] ) progress {
        display: block;
        width: 100%;
    }
    :host( [state="done"] ) span {
        display: block;
        color: green;
    }
    button {
        cursor: pointer;
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
      this._progressEl.value = value;
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

    this._progressEl = this._root.querySelector('progress');
    this._buttonEl = this._root.querySelector('button');

    this._buttonEl.addEventListener('click', this.download.bind(this));
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
   * Downloads the video using a stream reader and invokes `storeVideoChunk` to store individual
   * video chunks in IndexedDB.
   *
   * @returns {Promise} Promise that resolves with boolean `true` when download succeeds.
   */
  async download() {
    const videoURL = this.getDownloadableURL();
    const posterURL = this._videoData.thumbnail;
    const subtitlesURLs = (this._videoData['video-subtitles'] || []).map((subObject) => subObject.src);

    caches.open(this._cacheName).then(
      (cache) => {
        cache.addAll([posterURL, ...subtitlesURLs]);
      },
    );

    const fetchOpts = {
      headers: {},
    };
    let firstIndex = 0;
    let firstOffset = 0;
    let videoSizeInBytes = null;

    /**
     * Resume incomplete downloads.
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

    return new Promise((resolve) => {
      fetch(videoURL, fetchOpts)
        .then((response) => {
          /**
           * We're in the middle of the download.
           * Set the component state to `partial` to indicate that.
           */
          this.state = 'partial';

          /**
           * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
           */
          const reader = response.body.getReader();

          const chunk = {
            url: videoURL,
            offset: firstOffset,
            mime: response.headers.get('Content-Type') || this.getVideoMimeByURL(videoURL),
            sizeInBytes: videoSizeInBytes || parseInt(response.headers.get('Content-Length'), 10) || 1,
          };
          const index = firstIndex;

          const readChunk = () => {
            reader.read().then(({ done, value }) => {
              chunk.offset += value ? value.length : 0;
              chunk.data = value;
              chunk.done = done;
              chunk.index = index + 1;

              /**
               * Triggers the `progress` setter, which reflects to the `progress` attribute
               * and the `<progress>` element.
               */
              this.progress = chunk.offset / chunk.sizeInBytes;

              /**
               * Invoke the actual logic that stores received chunk data in IDB.
               */
              this.storeVideoChunk(chunk);

              /**
               * Repeat until we're done.
               *
               * This is a bit stupid, because the recursion here could leads to very deep
               * call-stacks when we try to download huge video files.
               *
               * But it's OK for now.
               */
              return done ? resolve(true) : readChunk();
            });
          };
          readChunk();
        });
    });
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
    const db = await IDBConnection.getConnection();
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
   * @todo Implement properly, returning a hardcoded default now.
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
      default: return 'video/mp4';
    }
  }

  /**
   * Retrieves the last stored data chunk for the current video.
   *
   * @returns {Promise} Promise that resolves with the last chunk data.
   */
  async getLastChunk() {
    const db = await IDBConnection.getConnection();
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
    const db = await IDBConnection.getConnection();
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
            <button>Download for Offline playback</button>
            <span>✔ Ready for offline playback.</span>
            <progress max="1" value="0"></progress>`;

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
    const db = await IDBConnection.getConnection();
    const url = this.getDownloadableURL();
    const videoMeta = await db.meta.get(url);

    this._videoData.meta = videoMeta;

    if (videoMeta.done) {
      this.state = 'done';
    } else if (videoMeta.offset > 0) {
      this.state = 'partial';
      this.progress = videoMeta.offset / videoMeta.sizeInBytes;
      this._buttonEl.innerHTML = 'Resume Download';
    } else {
      this.state = 'ready';
    }
  }
}
