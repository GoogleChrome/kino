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

import styles from './VideoPlayer.css';
import Streamer from '../../classes/Streamer';
import ParserMPD from '../../classes/ParserMPD';
import selectSource from '../../utils/selectSource';

import { MEDIA_SESSION_DEFAULT_ARTWORK } from '../../constants';

export default class extends HTMLElement {
  /**
   * @param {VideoDownloader} downloader Video downloader associated with the current video.
   */
  constructor(downloader) {
    super();

    this.internal = {
      downloader,
      root: this.attachShadow({ mode: 'open' }),
    };
  }

  /**
   * Returns the <source> tags HTML to be included in the
   * <video> element.
   *
   * @returns {string} Sources HTML.
   */
  getSourceHTML() {
    const sources = this.internal.videoData['video-sources'] || [];
    this.internal.selectedSource = selectSource(sources);

    if (this.internal.selectedSource) {
      return `<source src="${this.internal.selectedSource.src}" type="${this.internal.selectedSource.type}">`;
    }
    return '';
  }

  /**
   * Returns the <track> tags HTML to be included in the
   * <video> element.
   *
   * @returns {string} Tracks HTML.
   */
  getTracksHTML() {
    return (this.internal.videoData['video-subtitles'] || []).reduce(
      (markup, trackObject) => {
        markup += `<track ${trackObject.default ? 'default ' : ''}src="${trackObject.src}" kind="${trackObject.kind}" srclang="${trackObject.srclang}" label="${trackObject.label}">`;
        return markup;
      },
      '',
    );
  }

  /**
   * Renders the component.
   *
   * @param {object} videoData Video data.
   */
  render(videoData) {
    this.internal.videoData = videoData;

    /**
     * Returns either the default thumbnail `src` from an array or directly the `src` from a string.
     */
    const thumbnailUrl = Array.isArray(videoData.thumbnail)
      ? (videoData.thumbnail.find((t) => t.default)).src
      : videoData.thumbnail;

    const markup = `<style>${styles}</style>
    <video ${videoData.thumbnail ? `poster="${thumbnailUrl}"` : ''} controls crossorigin="anonymous">
      ${this.getSourceHTML()}
      ${this.getTracksHTML()}
    </video>
    `;

    while (this.internal.root.firstChild) {
      this.internal.root.removeChild(this.internal.root.firstChild);
    }
    this.internal.root.innerHTML = markup;

    this.videoElement = this.internal.root.querySelector('video');
    this.videoElement.addEventListener('error', this.handleVideoError.bind(this), true);

    /**
     * @todo Temporary. Remove when we figure out the UI.
     */
    const pipButton = this.createPiPButton();

    if (pipButton) {
      this.internal.root.appendChild(pipButton);
    }

    /**
     * Set up Media Session API integration.
     */
    this.internal.mediaSessionIsInit = false;
    this.videoElement.addEventListener('play', () => {
      if (!this.internal.mediaSessionIsInit) this.initMediaSession();
    });
  }

  /**
   * Handler for errors emitted by the <video> tag or any of its descendants.
   *
   * @param {Event} e Error event.
   */
  handleVideoError(e) {
    const el = e.target;
    const isSourceTag = el.tagName === 'SOURCE';

    if (!isSourceTag) return;

    const isMSEStream = this.internal.selectedSource?.isStream // This is a stream that...
      && this.internal.selectedSource?.canPlayTypeNatively === '' // ... we can't play natively, but...
      && this.internal.selectedSource?.canPlayTypeMSE === 'probably'; // we can play using MSE.

    if (isMSEStream) {
      this.initializeStream();
    }
  }

  /**
   * Picks a streaming <source> and plays it using MSE.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
   */
  async initializeStream() {
    const streamingSource = this.videoElement.querySelector('source');
    const mimeType = streamingSource.type;
    const manifestResponse = await fetch(streamingSource.src);
    const manifestDocument = await manifestResponse.text();

    let parser = null;

    if (mimeType === 'application/dash+xml') {
      parser = new ParserMPD(manifestDocument, streamingSource.src);
    }

    if (!parser) return;

    this.internal.streamer = new Streamer(this.videoElement, parser, {});
  }

  /**
   * Uses Media Session API to expose media controls outside the page.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API
   */
  initMediaSession() {
    this.internal.mediaSessionIsInit = true;

    if ('mediaSession' in navigator) {
      /**
       * @see https://web.dev/media-session/
       * @see https://developer.cdn.mozilla.net/en-US/docs/Web/API/Media_Session_API
       */
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: this.internal.videoData.title || '',
        artist: this.internal.videoData.artist || '',
        album: this.internal.videoData.album || '',
        artwork: this.internal.videoData['media-session-artwork'] || MEDIA_SESSION_DEFAULT_ARTWORK,
      });

      /**
       * Updates the position state in the Session notification.
       */
      const updatePositionState = () => {
        const duration = parseFloat(this.videoElement.duration);
        const playbackRate = parseFloat(this.videoElement.playbackRate);
        const currentTime = parseFloat(this.videoElement.currentTime);
        const isValid = Number.isFinite(duration)
          && Number.isFinite(playbackRate)
          && Number.isFinite(currentTime);

        if (isValid) {
          navigator.mediaSession.setPositionState({
            duration: this.videoElement.duration,
            playbackRate: this.videoElement.playbackRate,
            position: this.videoElement.currentTime,
          });
        }
      };

      /**
       * When the user seeks the video using the notification, forward the action
       * to the video element and update the progress bar position in the notification.
       *
       * @param {object} details Details about the action being handled.
       */
      const seekHandler = (details) => {
        let seekTime = this.videoElement.currentTime;
        if (details.action === 'seekforward') seekTime = Math.min(seekTime + 10, this.videoElement.duration);
        if (details.action === 'seekbackward') seekTime = Math.max(seekTime - 10, 0);
        if (details.action === 'seekto') seekTime = details.seekTime;

        if (details.fastSeek && 'fastSeek' in this.videoElement) {
          this.videoElement.fastSeek(seekTime);
        } else {
          this.videoElement.currentTime = seekTime;
        }
        updatePositionState();
      };

      /**
       * @todo Support previous and next track controls once we have collections.
       */

      const actionHandlers = [
        ['play', () => this.videoElement.play()],
        ['pause', () => this.videoElement.pause()],
        /*
        ['previoustrack', () => {}],
        ['nexttrack', () => {}],
        */
        ['stop', () => {
          this.videoElement.pause();
          this.videoElement.currentTime = 0;
          updatePositionState();
        }],
        ['seekbackward', seekHandler],
        ['seekforward', seekHandler],
        ['seekto', seekHandler],
      ];

      actionHandlers.forEach(
        ([action, handler]) => {
          try {
            navigator.mediaSession.setActionHandler(action, handler);
          } catch (e) {
            // Nothing to do here. Fail silently.
          }
        },
      );

      /**
       * Creates a closure and returns a throttled `timeupdate` handler.
       *
       * Note: This is often buggy in Chrome on Android. The progress bar usually does not
       * reflect the current media position when the video is playing.
       *
       * Potentially related:
       *
       * @see https://bugs.chromium.org/p/chromium/issues/detail?id=1153364&q=media%20component%3ABlink%3EMedia%3ESession&can=2
       * @returns {Function} Throttled `timeupdate` handler.
       */
      const getUpdateHandler = () => {
        let timeUpdateLocked = false;
        const throttleRate = 800;

        return () => {
          if (timeUpdateLocked) return;
          timeUpdateLocked = true;
          setTimeout(() => {
            timeUpdateLocked = false;
          }, throttleRate);
          updatePositionState();
        };
      };
      this.videoElement.addEventListener('timeupdate', getUpdateHandler());

      /**
       * Convey playback state to Media Session
       */
      this.videoElement.addEventListener('play', () => {
        navigator.mediaSession.playbackState = 'playing';
      });
      this.videoElement.addEventListener('pause', () => {
        navigator.mediaSession.playbackState = 'paused';
      });

      updatePositionState();
    }
  }

  /**
   * Signals the `play` intent to the <video> element.
   *
   * Waits for first data to arrive in case its `readyState`
   * indicates no data has been fetched at all. In those cases
   * it's possible we're initializing MSE and we can't really
   * use the `play` method if the source is going to change.
   */
  play() {
    const HAVE_NOTHING = 0;

    if (this.videoElement.readyState === HAVE_NOTHING) {
      this.videoElement.addEventListener('loadeddata', this.videoElement.play, { once: true });
    } else {
      this.videoElement.play();
    }

    this.internal.downloader.download({
      assetsOnly: true,
    });
  }

  /**
   * Returns a button that controls the PiP functionality.
   *
   * @returns {HTMLButtonElement|null} Button element or null when PiP not supported.
   */
  createPiPButton() {
    if (!('pictureInPictureEnabled' in document)) {
      return null;
    }

    const pipButton = document.createElement('button');
    const setPipButton = () => {
      pipButton.disabled = (this.videoElement.readyState === 0)
        || !document.pictureInPictureEnabled
        || this.videoElement.disablePictureInPicture;
    };

    pipButton.innerText = 'PiP';
    pipButton.addEventListener('click', async () => {
      pipButton.disabled = true;
      try {
        if (this !== document.pictureInPictureElement) {
          await this.videoElement.requestPictureInPicture();
        } else {
          await document.exitPictureInPicture();
        }
      } catch (error) {
        /* eslint-disable-next-line no-console */
        console.error(error);
      } finally {
        pipButton.disabled = false;
      }
    });

    this.videoElement.addEventListener('loadedmetadata', setPipButton);
    this.videoElement.addEventListener('emptied', setPipButton);
    setPipButton();

    return pipButton;
  }
}
