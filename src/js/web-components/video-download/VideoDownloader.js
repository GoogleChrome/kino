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

import styles from './VideoDownloader.css';

import getIDBConnection from '../../classes/IDBConnection';
import DownloadManager from '../../classes/DownloadManager';
import StorageManager from '../../classes/StorageManager';
import { MEDIA_SESSION_DEFAULT_ARTWORK, SETTING_KEY_BG_FETCH_API } from '../../constants';
import BackgroundFetch from '../../classes/BackgroundFetch';
import { loadSetting } from '../../utils/settings';
import getProgress from '../../utils/getProgress';

export default class VideoDownloader extends HTMLElement {
  /**
   * @type {string[]}
   */
  static get observedAttributes() {
    return ['state', 'progress', 'downloading', 'willremove', 'nocontrols'];
  }

  constructor({ connectionStatus }) {
    super();

    this.internal = {
      connectionStatus,
      changeCallbacks: [],
      root: this.attachShadow({ mode: 'open' }),
      files: [],
    };

    /** @type {DownloadManager} */
    this.downloadManager = null;

    /** @type {StorageManager} */
    this.storageManager = null;
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

  get nocontrols() {
    return this.getAttribute('nocontrols') === 'true';
  }

  set nocontrols(nocontrols) {
    this.setAttribute('nocontrols', nocontrols);
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
      const percentageAsDashOffset = 82 - (82 * value);
      this.internal.root.host.style.setProperty('--progress', percentageAsDashOffset);
    }

    // Broadcast changes in several internal properties.
    const currentState = {
      state: this.state,
      willremove: this.willremove,
      nocontrols: this.nocontrols,
    };

    if (Object.keys(currentState).includes(name)) {
      const typecastBooleans = (val) => (['false', 'true'].includes(val) ? val === 'true' : val);
      const oldState = {
        ...currentState,
        [name]: typecastBooleans(old),
      };

      this.internal.changeCallbacks.forEach(
        (callback) => callback(oldState, currentState),
      );
    }
  }

  /**
   * Component logic.
   *
   * @param {object} videoData   Video data coming from the API.
   * @param {string} cacheName Cache name.
   */
  async init(videoData, cacheName = 'v1') {
    this.internal = {
      ...this.internal,
      videoData,
      cacheName,
      elements: {},
    };

    const videoId = this.getId();
    const db = await getIDBConnection();
    const videoMeta = await db.meta.get(videoId);

    this.downloadManager = new DownloadManager(this.getId());
    this.internal.files = await this.downloadManager.prepareFileMeta();

    this.storageManager = new StorageManager(this.getId(), {
      fileMeta: this.internal.files,
    });

    this.setMeta(videoMeta);
    this.render();
  }

  /**
   * Returns the thumbnail image URLs.
   *
   * @returns {string[]} URLs.
   */
  getPosterURLs() {
    const urls = [];
    if (Array.isArray(this.internal.videoData.thumbnail)) {
      this.internal.videoData.thumbnail.forEach((thumbnail) => urls.push(thumbnail.src));
    } else {
      urls.push(this.internal.videoData.thumbnail);
    }
    return urls;
  }

  /**
   * Returns the subtitles URLs.
   *
   * @returns {string[]} URLs.
   */
  getSubtitlesUrls() {
    const subtitlesObjects = this.internal.videoData['video-subtitles'] || [];
    const subtitlesUrls = subtitlesObjects.map((subObject) => subObject.src);

    return subtitlesUrls;
  }

  /**
   * Returns the artwork images URLs used by Media Session API
   * to render the media popup / notification.
   *
   * @returns {string[]} URLs.
   */
  getMediaSessionArtworkUrls() {
    const artworkObjects = this.internal.videoData['media-session-artwork'] || MEDIA_SESSION_DEFAULT_ARTWORK;
    const artworkUrls = artworkObjects.map((artworkObject) => artworkObject.src);

    return artworkUrls;
  }

  /**
   * Saves assets to the specified cache using Cache API.
   *
   * @param {string[]} urls Array of URLs to be saved to the cache.
   */
  async saveToCache(urls) {
    try {
      const cache = await caches.open(this.internal.cacheName);

      urls.forEach(async (url) => {
        if (!await cache.match(url)) {
          await cache.add(url);
        }
      });
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        /**
         * @todo Display an alert or snackbar warning instead of console.
         */

        // eslint-disable-next-line no-console
        console.log('[VideoDownloader] Quota exceeded. Unable to cache video assets.');
      }
    }
  }

  /**
   * Downloads the current video and its assets to the cache and IDB.
   *
   * @param {object}  opts Download options.
   * @param {boolean} opts.assetsOnly  Whether to cache only video assets: poster images,
   *                                   subtitles and Media Session API artowrk.
   */
  async download(opts = {}) {
    const posterURLs = this.getPosterURLs();
    const subtitlesURLs = this.getSubtitlesUrls();
    const mediaSessionArtworkURLs = this.getMediaSessionArtworkUrls();

    this.saveToCache([...posterURLs, ...subtitlesURLs, ...mediaSessionArtworkURLs]);

    if (!opts.assetsOnly) {
      this.downloading = true;
      this.state = 'partial';

      if (
        loadSetting(SETTING_KEY_BG_FETCH_API)
        && 'BackgroundFetchManager' in window
        && 'serviceWorker' in navigator
      ) {
        this.nocontrols = true; // Browser will handle the download UI.
        this.downloadUsingBackgroundFetch();
      } else {
        this.downloadSynchronously();
      }
    }
  }

  downloadUsingBackgroundFetch() {
    const bgFetch = new BackgroundFetch();

    bgFetch.onprogress = (progress) => {
      this.progress = progress;
    };
    bgFetch.ondone = () => {
      this.progress = 100;
      this.downloading = false;
      this.state = 'done';
    };

    bgFetch.start(this.internal.videoData);
  }

  /**
   * Takes a list of video URLs, downloads the video using a stream reader
   * and invokes `storeVideoChunk` to store individual video chunks in IndexedDB.
   */
  async downloadSynchronously() {
    this.storageManager.onprogress = (progress) => {
      this.progress = progress;
    };

    this.storageManager.onerror = (error) => {
      if (this.downloading && error.name === 'QuotaExceededError') {
        /**
         * Allow some time for any remaining pending transactions to error out, too,
         * before we remove the partially removed video.
         */
        setTimeout(() => {
          this.cancel();
          this.removeFromIDB();
          this.state = 'ready';
        }, 1000);
      }
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
    this.downloadManager.attachFlushHandler(boundStoreChunkHandler);

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

        <span class="willremove">
          <button class="undo-remove" title="Undo deletion">Undo</button>
        </span>
        <button class="ready" aria-label="Make available offline">
          <div class="tooltip">
            <svg class="icon icon--download" viewBox="0 0 27 27" width="27" height="27" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7.304 25.416h11.56c4.026 0 6.552-2.852 6.552-6.888V7.638c0-4.036-2.512-6.888-6.552-6.888H7.304C3.265.75.752 3.602.752 7.638v10.89c0 4.036 2.514 6.888 6.554 6.888z" fill="" stroke="" stroke-width="1.5"/>
              <path d="M13.084 18.531V7.635M18.08 13.513l-4.996 5.018-4.998-5.018" fill="none" stroke="" stroke-width="1.5"/>
            </svg>
            <div class="tooltip--message">Make available offline<span class="tooltip--arrow"></span></div>
          </div>
        </button>
        <button class="button--contextual action--undo">Undo</button>

        <button class="downloading">
          <div class="tooltip">
            <svg class="icon icon--progress" width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
              <circle cx="14" cy="14" r="13" fill="none" stroke="#e6e4e7" stroke-width="1.5" />
              <circle cx="14" cy="14" r="13" fill="none" stroke="#000" stroke-width="1.5" stroke-dashoffset="var(--progress, 82)" stroke-dasharray="82" />
              <path d="M18.385 11.615a2 2 0 00-2-2h-4.74a2 2 0 00-2 2v4.74a2 2 0 002 2h4.74a2 2 0 002-2v-4.74z" fill="#141216"/>
            </svg>
            <div class="tooltip--message">Pause download<span class="tooltip--arrow"></span></div>
          </div>
        </button>

        <button class="paused">
          <div class="tooltip">
            <svg class="icon icon--progress" width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
              <circle cx="14" cy="14" r="13" fill="none" stroke="#e6e4e7" stroke-width="1.5" />
              <circle cx="14" cy="14" r="13" fill="none" stroke="#000" stroke-width="1.5" stroke-dashoffset="var(--progress, 82)" stroke-dasharray="82" />
              <path d="M17.36 11.23a1.026 1.026 0 000-2.05h-6.69a1.026 1.026 0 000 2.05h6.69zM14 19.94c.566 0 4.385-5.922 4.385-6.488 0-.566-.46-1.025-1.025-1.025h-6.69c-.566 0-1.026.46-1.026 1.025 0 .566 4.356 6.488 4.356 6.488z" fill="#141216"/>
            </svg>
            <div class="tooltip--message">Continue download<span class="tooltip--arrow"></span></div>
          </div>
        </button>
        <button class="button--contextual action--cancel">Cancel</button>

        <button class="done">
          <div class="tooltip">
            <svg class="icon icon--downloaded-remove" viewBox="0 0 27 27" width="27" height="27" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
              <g class="remove">
                <path d="M26.308 18.726c0 4.77-2.812 7.582-7.582 7.582H8.344c-4.783 0-7.594-2.812-7.594-7.582V8.332C.75 3.562 2.502.75 7.273.75h2.665c.958 0 1.86.45 2.435 1.217l1.217 1.618a3.051 3.051 0 002.434 1.217h3.773c4.783 0 6.547 2.434 6.547 7.303l-.036 6.621z" fill="#ff375c" stroke="#ff375c" stroke-width="1.5"/>
                <path d="M16.91 11.842l-6.39 6.39M16.911 18.235l-6.395-6.396" fill="none" stroke="#fff" stroke-width="2"/>
              </g>
              <g class="downloaded">
                <path d="M26.308 18.726c0 4.77-2.812 7.582-7.582 7.582H8.344c-4.783 0-7.594-2.812-7.594-7.582V8.332C.75 3.562 2.502.75 7.273.75h2.665c.958 0 1.86.45 2.435 1.217l1.216 1.618a3.055 3.055 0 002.435 1.217h3.773c4.783 0 6.547 2.434 6.547 7.303l-.036 6.621z" fill="none" stroke="#858287" stroke-width="1.5"/>
                <path d="M8.968 15.05l3.166 3.163 6.328-6.328" fill="none" stroke="#858287" stroke-width="1.5"/>
              </g>
            </svg>
            <div class="tooltip--message">Remove offline version<span class="tooltip--arrow"></span></div>
          </div>
        </button>
      </div>`;

    while (this.internal.root.firstChild) {
      this.internal.root.removeChild(this.internal.root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this.internal.root.appendChild(ui);
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
    } else if (this.willremove === true) {
      if (this.removalTimeout) {
        this.state = 'done';
        this.willremove = false;
        clearTimeout(this.removalTimeout);
        window.removeEventListener('beforeunload', this.unloadHandler);
      }
    } else if (e.target.classList.contains('action--cancel')) {
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
    return this.internal.videoData?.id || '';
  }

  /**
   * Retrieve information about video download state and update
   * component's `state` and `progress` attribute values.
   */
  async setDownloadState() {
    const videoMeta = this.getMeta();
    const downloadProgress = getProgress(this.internal.files);

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
    this.init(this.internal.videoData, this.internal.cacheName);
  }
}
