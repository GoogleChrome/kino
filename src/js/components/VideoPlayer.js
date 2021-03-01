/**
 * WIP
 */

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
export default class extends HTMLElement {
  constructor() {
    super();

    this.internal = {};
    this.internal.root = this.attachShadow({ mode: 'open' });
  }

  render(videoData) {
    this.internal.videoData = videoData;

    const sourcesHTML = videoData['video-sources'].reduce(
      (markup, sourceObject) => {
        markup += `<source src="${sourceObject.src}" type="${sourceObject.type}">`;
        return markup;
      },
      '',
    );
    const tracksHTML = (videoData['video-subtitles'] || []).reduce(
      (markup, trackObject) => {
        markup += `<track ${trackObject.default ? 'default ' : ''}src="${trackObject.src}" kind="${trackObject.kind}" srclang="${trackObject.srclang}" label="${trackObject.label}">`;
        return markup;
      },
      '',
    );

    const markup = `${style}
    <video ${videoData.thumbnail ? `poster="${videoData.thumbnail}"` : ''} controls crossorigin="anonymous">
      ${sourcesHTML}
      ${tracksHTML}
    </video>
    `;

    while (this.internal.root.firstChild) {
      this.internal.root.removeChild(this.internal.root.firstChild);
    }
    this.internal.root.innerHTML = markup;
    this.videoElement = this.internal.root.querySelector('video');

    /**
     * Set up Media Session API integration.
     */
    this.internal.mediaSessionIsInit = false;

    this.videoElement.addEventListener('play', () => {
      if (!this.internal.mediaSessionIsInit) this.initMediaSession();
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
        artwork: [
          { src: '/images/media-session/artwork-96x96.jpg', sizes: '96x96', type: 'image/jpeg' },
          { src: '/images/media-session/artwork-128x128.jpg', sizes: '128x128', type: 'image/jpeg' },
          { src: '/images/media-session/artwork-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
          { src: '/images/media-session/artwork-256x256.jpg', sizes: '256x256', type: 'image/jpeg' },
          { src: '/images/media-session/artwork-384x384.jpg', sizes: '384x384', type: 'image/jpeg' },
          { src: '/images/media-session/artwork-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      /**
       * Updates the position state in the Session notification.
       */
      const updatePositionState = () => {
        navigator.mediaSession.setPositionState({
          duration: this.videoElement.duration,
          playbackRate: this.videoElement.playbackRate,
          position: this.videoElement.currentTime,
        });
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
