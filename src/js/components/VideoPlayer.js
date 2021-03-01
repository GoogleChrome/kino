import Streamer from '../modules/Streamer.module';
import ParserMPD from '../modules/ParserMPD.module';
import { MEDIA_SESSION_DEFAULT_ARTWORK } from '../constants';

const style = `
<style>
  :host {
    display: flex;
    align-items: center;
  }
  video {
    width: 100%;
    height: auto;
  }
</style>
`;

const STREAMING_MIME_TYPES = [
  'application/dash+xml',
  'application/vnd.apple.mpegurl', // <-- HLS (m3u8)
];
export default class extends HTMLElement {
  constructor() {
    super();

    this.internal = {};
    this.internal.root = this.attachShadow({ mode: 'open' });
  }

  /**
   * @returns {boolean} Whether the client supports MSE.
   */
  clientSupportsMSE() {
    return 'MediaSource' in window;
  }

  /**
   * Returns an array of source objects appropriate to capabilities
   * of the current client.
   *
   * In case the client supports video streaming (DASH / HLS) and sources
   * include streaming sources (MPD, M3U8 manifests), return only the
   * streaming sources.
   *
   * In all other cases return all video sources as returned from the API.
   *
   * @returns {Array} Appropriate sources.
   */
  getAppropriateSources() {
    const clientSupportsMSE = this.clientSupportsMSE();
    const sources = this.internal.videoData['video-sources'] || [];
    const streamingSources = sources.filter(
      (sourceObject) => STREAMING_MIME_TYPES.includes(sourceObject.type),
    );

    if (clientSupportsMSE && streamingSources.length) {
      return streamingSources;
    }
    return sources;
  }

  /**
   * Returns the <source> tags HTML to be included in the
   * <video> element.
   *
   * @returns {string} Sources HTML.
   */
  getSourcesHTML() {
    const sources = this.getAppropriateSources();
    return sources.reduce(
      (markup, sourceObject) => {
        markup += `<source src="${sourceObject.src}" type="${sourceObject.type}">`;
        return markup;
      },
      '',
    );
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
   * Returns a boolean indicating whether any of the video sources
   * point to streaming resources (DASH/HLS).
   *
   * @returns {boolean} Does any video source point to a streaming resource?
   */
  hasStreamingSource() {
    const sources = this.internal.videoData['video-sources'] || [];
    const streamingSources = sources.filter(
      (sourceObject) => STREAMING_MIME_TYPES.includes(sourceObject.type),
    );

    return streamingSources.length > 0;
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

    const markup = `${style}
    <video ${videoData.thumbnail ? `poster="${thumbnailUrl}"` : ''} controls crossorigin="anonymous">
      ${this.getSourcesHTML()}
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

    const allSources = [...this.videoElement.querySelectorAll('source')];
    const lastSource = allSources.pop();
    const isSourceTagLast = lastSource === el;

    /**
     * If an error is invoked on the last source element, it is a signal that
     * the client is not able to natively play one of the provided <source>s.
     *
     * In that case we can take over manually and attempt to pick a streaming
     * source (`.mpd`, `.m3u8`) and play it back through MSE.
     *
     * @see https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element
     */
    if (isSourceTagLast && this.hasStreamingSource()) {
      this.playStream();
    }
  }

  /**
   * Picks a streaming <source> and plays it using MSE.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
   */
  async playStream() {
    const sourceEls = [...this.videoElement.querySelectorAll('source')];
    const streamingSource = sourceEls.find(
      (sourceEl) => STREAMING_MIME_TYPES.includes(sourceEl.type),
    );

    if (!streamingSource) return;

    const mimeType = streamingSource.type;
    const manifestResponse = await fetch(streamingSource.src);
    const manifestDocument = await manifestResponse.text();

    let parser = null;

    if (mimeType === 'application/dash+xml') {
      parser = new ParserMPD(manifestDocument);
    }

    if (!parser) return;

    this.internal.streamer = new Streamer(this.videoElement, parser, {
      manifestSrc: streamingSource.src,
    });
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
        artwork: MEDIA_SESSION_DEFAULT_ARTWORK,
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
       *
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
}
