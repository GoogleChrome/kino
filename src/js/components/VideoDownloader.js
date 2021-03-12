import getIDBConnection from '../modules/IDBConnection.module';
import DownloadManager from './VideoDownloader/DownloadManager.module';
import StorageManager from './VideoDownloader/StorageManager.module';
import { getURLsForDownload } from './VideoDownloader/Urls.module';

const style = `
<style>
    :host,
    :host > * {
        display: none;
    }
    :host {
      min-width: 26px;
      min-height: 26px;
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
    :host( [state="partial"] ) .partial,
    :host( [state="ready"][willremove="true"] ) .willremove {
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
    :host( [state="partial"][downloading="false"] ) .cancel,
    :host( [state="ready"][willremove="true"] ) .willremove button {
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
    return ['state', 'progress', 'downloading', 'willremove'];
  }

  constructor() {
    super();

    // Attach Shadow DOM.
    this.internal = {};
    this.internal.root = this.attachShadow({ mode: 'open' });
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

  get willremove() {
    return this.getAttribute('willremove') === 'true';
  }

  set willremove(willremove) {
    this.setAttribute('willremove', willremove);
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
      this.internal.elements.progress.setAttribute('progress', value);
    }
  }

  /**
   * Component logic.
   *
   * @param {object} apiData   Video data coming from the API.
   * @param {string} cacheName Cache name.
   */
  init(apiData, cacheName = 'v1') {
    this.internal = {
      ...this.internal,
      apiData,
      cacheName,
      elements: {},
    };

    const videoId = this.getId();
    const sources = this.internal.apiData['video-sources'] || [];

    getURLsForDownload(videoId, sources).then(async (files) => {
      const db = await getIDBConnection();
      const dbFiles = await db.file.getByVideoId(videoId);
      const dbFilesUrlTuples = dbFiles.map((fileMeta) => [fileMeta.url, fileMeta]);
      const dbFilesByUrl = Object.fromEntries(dbFilesUrlTuples);

      /**
       * If we have an entry for this file in the database, use it. Otherwise
       * fall back to the freshly generated FileMeta object.
       */
      const filesWithStateUpdatedFromDb = files.map(
        (fileMeta) => (dbFilesByUrl[fileMeta.url] ? dbFilesByUrl[fileMeta.url] : fileMeta),
      );

      const videoMeta = await db.meta.get(videoId);
      this.setMeta(videoMeta);
      this.internal.files = filesWithStateUpdatedFromDb;

      this.render();
    });
  }

  /**
   * Returns the thumbnail image URLs.
   *
   * @returns {string[]} URLs.
   */
  getPosterURLs() {
    const urls = [];
    if (Array.isArray(this.internal.apiData.thumbnail)) {
      this.internal.apiData.thumbnail.forEach((thumbnail) => urls.push(thumbnail.src));
    } else {
      urls.push(this.internal.apiData.thumbnail);
    }
    return urls;
  }

  /**
   * Returns the subtitles URLs.
   *
   * @returns {string[]} URLs.
   */
  getSubtitlesUrls() {
    const subtitlesObjects = this.internal.apiData['video-subtitles'] || [];
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
    const cache = await caches.open(this.internal.cacheName);
    return cache.addAll(urls);
  }

  /**
   * Downloads the current video and its assets to the cache and IDB.
   */
  async download() {
    const posterURLs = this.getPosterURLs();
    const subtitlesURLs = this.getSubtitlesUrls();

    this.downloading = true;
    this.saveToCache([...posterURLs, ...subtitlesURLs]);
    this.runIDBDownloads();
  }

  /**
   * Returns the total download progress for the video.
   *
   * @returns {number} Percentage progress for the video in the range 0–100.
   */
  getProgress() {
    const pieceValue = 1 / this.internal.files.length;
    const percentageProgress = this.internal.files.reduce(
      (percentage, fileMeta) => {
        if (fileMeta.done) {
          percentage += pieceValue;
        } else if (fileMeta.bytesDownloaded === 0 || !fileMeta.bytesTotal) {
          percentage += 0;
        } else {
          const percentageOfCurrent = fileMeta.bytesDownloaded / fileMeta.bytesTotal;
          percentage += percentageOfCurrent * pieceValue;
        }
        return percentage;
      },
      0,
    );
    const clampedPercents = Math.max(0, Math.min(percentageProgress, 100));

    return clampedPercents;
  }

  /**
   * Takes a list of video URLs, downloads the video using a stream reader
   * and invokes `storeVideoChunk` to store individual video chunks in IndexedDB.
   */
  async runIDBDownloads() {
    this.downloadManager = new DownloadManager(this);
    this.storageManager = new StorageManager(this);

    this.storageManager.onprogress = (progress) => {
      this.progress = progress;
    };
    this.storageManager.ondone = () => {
      this.progress = 100;
      this.state = 'done';
    };

    /**
     * The `DownloadManager` instance will download all remaining files in sequence and will
     * emit data chunks along the way.
     *
     * We subscribe the `StoreManager` instance to the `onflush` event of the `DownloadManager`
     * to make sure all chunks are sent to the `storeChunk` method of the `StoreManager`.
     */
    const boundStoreChunkHandler = this.storageManager.storeChunk.bind(this.storageManager);
    this.downloadManager.onflush = boundStoreChunkHandler;

    this.state = 'partial';
    this.downloadManager.run();
  }

  /**
   * Renders the UI.
   *
   * @returns {void}
   */
  render() {
    const templateElement = document.createElement('template');
    templateElement.innerHTML = `${style}
      <span class="partial">
        <button class="cancel" title="Cancel and remove">Cancel</button>
      </span>
      <span class="willremove">
        <button class="undo-remove" title="Undo deletion">Undo</button>
      </span>
      <button class="ready">
        <img src="/images/download-circle.svg" alt="Download" />
        <span class="expanded">Make available offline</span>
      </button>
      <button class="partial">
        <div class="progress">
          <progress-ring stroke="2" radius="13" progress="0"></progress-ring>
          <img class="resume" src="/images/download-resume.svg" alt="Resume" />
          <img class="pause" src="/images/download-pause.svg" alt="Pause" />
        </div>
        <span class="expanded pause">Pause download</span>
        <span class="expanded resume">Resume download</span>
      </button>
      <button class="done">
        <img class="ok" src="/images/download-done.svg" alt="Done" />
        <img class="delete" src="/images/download-delete.svg" alt="Delete" title="Delete the video from cache." />
        <span class="expanded ok">Downloaded</span>
        <span class="expanded delete">Remove video</span>
      </button>`;

    while (this.internal.root.firstChild) {
      this.internal.root.removeChild(this.internal.root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this.internal.root.appendChild(ui);

    this.internal.elements.progress = this.internal.root.querySelector('progress-ring');
    this.internal.elements.buttons = this.internal.root.querySelectorAll('button');

    this.setDownloadState();

    this.internal.elements.buttons.forEach((button) => {
      button.addEventListener('click', this.clickHandler.bind(this));
    });
  }

  /**
   * Responds to a Download / Pause / Cancel click.
   *
   * @param {Event} e Click event.
   */
  clickHandler(e) {
    if (this.state === 'done') {
      this.willremove = true;
      this.state = 'ready';

      window.addEventListener('beforeunload', this.unloadHandler);
      this.removalTimeout = setTimeout(async () => {
        this.willremove = false;
        await this.removeFromIDB();
        window.removeEventListener('beforeunload', this.unloadHandler);
      }, 5000);
    } else if (e.target.className === 'undo-remove') {
      if (this.willremove === true) {
        if (this.removalTimeout) {
          this.state = 'done';
          clearTimeout(this.removalTimeout);
          window.removeEventListener('beforeunload', this.unloadHandler);
        }
      }
    } else if (e.target.className === 'cancel') {
      this.removeFromIDB();
    } else if (this.downloading === false) {
      this.download();
    } else {
      this.downloadManager.pause();
      this.downloading = false;
    }
  }

  /**
   * Page `beforeunload` event handler.
   *
   * @param {Event} unloadEvent Unload event.
   */
  unloadHandler(unloadEvent) {
    unloadEvent.returnValue = '';
    unloadEvent.preventDefault();
  }

  /**
   * @returns {VideoMeta} Video meta value.
   */
  getMeta() {
    return this.internal.meta || {};
  }

  /**
   * @param {VideoMeta} meta Video meta value.
   */
  setMeta(meta) {
    this.internal.meta = meta;
  }

  /**
   * Returns the associated video ID.
   *
   * @returns {string} Video ID.
   */
  getId() {
    return this.internal.apiData?.id || '';
  }

  /**
   * Retrieve information about video download state and update
   * component's `state` and `progress` attribute values.
   */
  async setDownloadState() {
    const videoMeta = this.getMeta();
    const downloadProgress = this.getProgress();

    if (videoMeta.done) {
      this.state = 'done';
    } else if (downloadProgress) {
      this.state = 'partial';
      this.progress = downloadProgress;
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

    this.state = 'removing';
    await db.removeVideo(this.getId(), this.internal.files);
    this.init(this.internal.apiData, this.internal.cacheName);
  }
}
