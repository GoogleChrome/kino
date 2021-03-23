import styles from './VideoDownloader.css';

import getIDBConnection from '../../classes/IDBConnection';
import DownloadManager from '../../classes/DownloadManager';
import StorageManager from '../../classes/StorageManager';
import getURLsForDownload from '../../utils/getURLsForDownload';

export default class VideoDownloader extends HTMLElement {
  static get observedAttributes() {
    return ['state', 'progress', 'downloading', 'willremove'];
  }

  constructor({ connectionStatus }) {
    super();

    this.internal = {
      connectionStatus,
      changeCallbacks: [],
      root: this.attachShadow({ mode: 'open' }),
    };
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
    const oldState = this.state;
    this.setAttribute('state', state);

    this.internal.changeCallbacks.forEach(
      (callback) => callback(oldState, state),
    );
  }

  /**
   * Subscribe to state changes.
   *
   * @param {Function} callback Callback function to run when the component's state changes.
   */
  subscribe(callback) {
    this.internal.changeCallbacks.push(callback);
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
      this.downloading = false;
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
    templateElement.innerHTML = `<style>${styles}</style>
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
          this.willremove = false;
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
   * Cancels any ongoing operation.
   */
  cancel() {
    if (this.downloadManager) this.downloadManager.cancel();
    if (this.storageManager) this.storageManager.cancel();

    this.downloading = false;
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

    await db.removeVideo(this.getId(), this.internal.files);
    this.init(this.internal.apiData, this.internal.cacheName);
  }
}
