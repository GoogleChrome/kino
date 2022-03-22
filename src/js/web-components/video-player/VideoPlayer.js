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

import {
  CAST_CLASSNAME,
  CAST_HAS_TARGET_NAME,
  CAST_TARGET_NAME,
  MEDIA_SESSION_DEFAULT_ARTWORK,
  PIP_CLASSNAME,
  STATS_OVERLAY_CLASSNAME,
  STATS_OVERLAY_DISPLAYED_CLASSNAME,
} from '../../constants';
import decryptVideo from '../../utils/decryptVideo';
import { getMediaConfigurationAudio, getMediaConfigurationVideo } from '../../utils/getMediaConfiguration';
import getDecodingInfo from '../../utils/getDecodingInfo';

export default class VideoPlayer extends HTMLElement {
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
   * Mutes the video.
   */
  mute() {
    this.videoElement.muted = true;
  }

  /**
   * Unmutes the video.
   */
  unmute() {
    this.videoElement.muted = false;
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
    <video
      ${videoData.thumbnail ? `poster="${thumbnailUrl}"` : ''}
      controls crossorigin="anonymous"
    >
      ${this.getSourceHTML()}
      ${this.getTracksHTML()}
    </video>
    <div class="floating-buttons"></div>
    <div class="pip-overlay">
      <svg viewBox="0 0 129 128" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M108.5 48V16a8.001 8.001 0 0 0-8-8h-84a8 8 0 0 0-8 8v68a8 8 0 0 0 8 8h20" stroke="var(--icon)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M52.5 112V72a8 8 0 0 1 8-8h52a8 8 0 0 1 8 8v40a8 8 0 0 1-8 8h-52a8 8 0 0 1-8-8Z" stroke="var(--icon)" stroke-width="3" stroke-miterlimit="10" stroke-linecap="square"/></svg>
      <p>This video is playing in picture in picture</p>
    </div>
    <div class="cast-overlay">
      <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-miterlimit="10"><path d="M34.133 107.201c0-13.253-10.747-24-24-24M53.333 107.2c0-23.861-19.339-43.2-43.2-43.2" fill="none" stroke="var(--icon)" stroke-width="8"/><path d="M10.133 112.001a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6Z" fill="var(--icon)" fill-rule="nonzero"/><path d="M5.333 49.778V32c0-5.891 4.776-10.667 10.667-10.667h96c5.891 0 10.667 4.776 10.667 10.667v64c0 5.891-4.776 10.667-10.667 10.667H72.381" fill="none" stroke="var(--icon)" stroke-width="8"/></svg>
      <p>Casting<span class="cast-target"> to <span class="cast-target-name"></span></span></p>
    </div>
    <div class="stats-overlay">STATS OVERLAY</div>
    `;

    while (this.internal.root.firstChild) {
      this.internal.root.removeChild(this.internal.root.firstChild);
    }
    this.internal.root.innerHTML = markup;

    /**
     * @type {HTMLMediaElement}
     */
    this.videoElement = this.internal.root.querySelector('video');
    this.videoElement.addEventListener('error', this.handleVideoError.bind(this), true);

    if (videoData.encryption) {
      decryptVideo(this.videoElement, videoData.encryption);
    }

    const floatingButtonsBar = this.internal.root.querySelector('.floating-buttons');
    const pipButton = this.createPiPButton();

    if (pipButton) {
      floatingButtonsBar.appendChild(pipButton);
    }

    if (this.internal.videoData.cast) {
      window.kinoInitGoogleCast().then((castButton) => {
        floatingButtonsBar.appendChild(castButton);

        window.cast.framework.CastContext.getInstance().addEventListener(
          window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          this.initCast.bind(this),
        );
      });
    }

    /**
     * Set up Media Session API integration.
     */
    this.internal.mediaSessionIsInit = false;
    this.videoElement.addEventListener('play', () => {
      if (!this.internal.mediaSessionIsInit) this.initMediaSession();
    });

    /**
     * Set up the stats overlay.
     */
    if (this.internal.videoData.stats) {
      this.videoElement.addEventListener(
        'play',
        () => this.classList.add(STATS_OVERLAY_DISPLAYED_CLASSNAME),
        { once: true },
      );

      this.videoElement.addEventListener('playing', this.updateStatsOverlay.bind(this));
      this.videoElement.addEventListener('timeupdate', this.updateStatsOverlay.bind(this));
    }
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
   *
   * @returns {Promise<this>} Promise indicating whether the playback started.
   *                          Returns the current `VideoPlayer` instance, which
   *                          allows outside code to respond to success or failure
   *                          adequately, e.g. by muting the video and retrying.
   */
  play() {
    const HAVE_NOTHING = 0;

    return new Promise((resolve, reject) => {
      const resolvePlayIntent = async () => {
        try {
          await this.videoElement.play();

          this.internal.downloader.download({
            assetsOnly: true,
          });

          resolve(this);
        } catch (_) {
          reject(this);
        }
      };

      if (this.videoElement.readyState === HAVE_NOTHING) {
        this.videoElement.addEventListener('loadeddata', resolvePlayIntent, { once: true });
      } else {
        resolvePlayIntent();
      }
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
    if (!this.internal.videoData.pip) {
      return null;
    }

    const ENTER_PIP_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 15v6a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 21V8.25A1.5 1.5 0 0 1 3 6.75h3.75" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.75 3v7.5a1.5 1.5 0 0 0 1.5 1.5H21a1.5 1.5 0 0 0 1.5-1.5V3A1.5 1.5 0 0 0 21 1.5h-9.75A1.5 1.5 0 0 0 9.75 3Z" stroke="var(--accent)" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="square"/><path d="M9 18.75V15H5.25M5.25 18.75 9 15" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const LEAVE_PIP_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 9V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v12.75a1.5 1.5 0 0 0 1.5 1.5h3.75" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.25 9V5.25H9M9 9 5.25 5.25" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.75 21v-7.5a1.5 1.5 0 0 1 1.5-1.5H21a1.5 1.5 0 0 1 1.5 1.5V21a1.5 1.5 0 0 1-1.5 1.5h-9.75a1.5 1.5 0 0 1-1.5-1.5Z" stroke="var(--accent)" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="square"/></svg>';

    const pipButton = document.createElement('button');
    const setPipButton = () => {
      pipButton.disabled = (this.videoElement.readyState === 0)
        || !document.pictureInPictureEnabled
        || this.videoElement.disablePictureInPicture;
    };

    pipButton.setAttribute('aria-label', 'Toggle picture in picture');
    pipButton.innerHTML = ENTER_PIP_SVG;

    pipButton.addEventListener('click', async () => {
      pipButton.disabled = true;
      try {
        if (this !== document.pictureInPictureElement) {
          // If another video is already in PiP, pause it.
          if (document.pictureInPictureElement instanceof VideoPlayer) {
            document.pictureInPictureElement.videoElement.pause();
          }
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
    this.videoElement.addEventListener('enterpictureinpicture', () => {
      pipButton.innerHTML = LEAVE_PIP_SVG;
      this.classList.add(PIP_CLASSNAME);
    });
    this.videoElement.addEventListener('leavepictureinpicture', () => {
      pipButton.innerHTML = ENTER_PIP_SVG;
      this.classList.remove(PIP_CLASSNAME);
    });

    setPipButton();

    return pipButton;
  }

  /**
   * Initializes Google Cast functionality.
   *
   * @param {SessionStateEventData} e SessionStateEventData instance.
   * @returns {void}
   */
  async initCast(e) {
    if (e.sessionState === 'SESSION_STARTED' || e.sessionState === 'SESSION_RESUMED') {
      const castableSources = this.internal.videoData['video-sources'].filter((source) => source.cast === true);

      if (!castableSources) {
        /* eslint-disable-next-line no-console */
        console.error('[Google Cast] The media has no source suitable for casting.');
        return;
      }

      const castSession = window.cast.framework.CastContext.getInstance().getCurrentSession();
      const mediaInfo = new window.chrome.cast.media.MediaInfo(
        castableSources[0].src,
        castableSources[0].type,
      );
      const videoThumbnail = new window.chrome.cast.Image(this.internal.videoData.thumbnail);
      const metadata = new window.chrome.cast.media.GenericMediaMetadata();

      metadata.title = this.internal.videoData.title;

      /**
       * @todo Add the Media Session artwork and define image dimensions explicitly.
       */
      metadata.images = [videoThumbnail];
      mediaInfo.metadata = metadata;

      /** @type {Array} */
      const subtitles = this.internal.videoData['video-subtitles'] || [];
      const defaultSubtitles = subtitles.find((subtitle) => subtitle.default);

      /**
       * AFAICT the Default Media Receiver doesn't implement any UI to
       * select the subtitle track.
       *
       * We only add the subtitle track if there is a default one.
       */
      if (defaultSubtitles) {
        const defaultSubtitlesTrack = new window.chrome.cast.media.Track(
          1,
          window.chrome.cast.media.TrackType.TEXT,
        );

        defaultSubtitlesTrack.trackContentId = defaultSubtitles.src;
        defaultSubtitlesTrack.subtype = window.chrome.cast.media.TextTrackType.SUBTITLES;
        defaultSubtitlesTrack.name = defaultSubtitles.label;
        defaultSubtitlesTrack.language = defaultSubtitles.srclang;
        defaultSubtitlesTrack.trackContentType = 'text/vtt';

        mediaInfo.tracks = [defaultSubtitlesTrack];
      }

      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);

      try {
        await castSession.loadMedia(request);
      } catch (error) {
        /* eslint-disable-next-line no-console */
        console.error(`[Google Cast] Error code: ${error}`);
        return;
      }

      const targetName = castSession.getCastDevice().friendlyName;
      this.internal.root.querySelector(`.${CAST_TARGET_NAME}`).innerText = targetName;
      this.classList.toggle(CAST_HAS_TARGET_NAME, targetName);
      this.classList.add(CAST_CLASSNAME);
    }

    if (e.sessionState === 'SESSION_ENDED') {
      this.classList.remove(CAST_CLASSNAME);
    }
  }

  /**
   * Updates the video playback statistics rendered on top of the video.
   */
  async updateStatsOverlay() {
    let capText = '';
    let vqText = '';
    let mediaText = '';

    const statsOverlayEl = this.internal.root.querySelector(`.${STATS_OVERLAY_CLASSNAME}`);

    /** @type {VideoPlaybackQuality} */
    const vq = this.videoElement.getVideoPlaybackQuality();
    const vqData = [
      ['Total frames: ', vq.totalVideoFrames],
      ['Dropped frames: ', vq.droppedVideoFrames],
    ];
    vqText = vqData.map(([label, value]) => `<div>${label}${value}</div>`).join('');

    const reps = this.internal.streamer?.stream?.media?.representations;
    const selectedReps = this.internal.streamer?.stream?.media?.lastRepresentationsIds;

    if (reps && selectedReps) {
      const videoId = selectedReps.video;
      const audioId = selectedReps.audio;

      const videoRep = reps.video.find((rep) => rep.id === videoId);
      const audioRep = reps.audio.find((rep) => rep.id === audioId);

      if (videoRep && audioRep) {
        const videoConfiguration = getMediaConfigurationVideo(videoRep);
        const audioConfiguration = getMediaConfigurationAudio(audioRep);
        const mediaConfiguration = { ...videoConfiguration, ...audioConfiguration };

        const decodingInfo = await getDecodingInfo(mediaConfiguration);

        const capData = [
          ['Power efficient: ', decodingInfo.powerEfficient],
          ['Smooth: ', decodingInfo.smooth],
          ['Supported: ', decodingInfo.supported],
        ];
        capText = capData.map(([label, value]) => `<div>${label}${value}</div>`).join('');

        const mediaData = [
          ['Video codec: ', videoConfiguration.video.contentType],
          ['Video resolution: ', `${videoConfiguration.video.width}x${videoConfiguration.video.height}`],
          ['Audio codec: ', audioConfiguration.audio.contentType],
          ['Audio bitrate: ', audioConfiguration.audio.bitrate],
          ['Audio sampling rate: ', audioConfiguration.audio.samplerate],
          ['Audio channels: ', audioConfiguration.audio.channels],
        ];
        mediaText = mediaData.map(([label, value]) => `<div>${label}${value}</div>`).join('');
      }
    }

    statsOverlayEl.innerHTML = `
      <h4>Media Info</h4>
      ${mediaText}
      <h4>Video Playback Quality API</h4>
      ${vqText}
      <h4>Media Capabilities API</h4>
      ${capText}`;
  }
}
