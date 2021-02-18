const DEFAULT_VIDEO_PRIORITIES = [
  '[mimeType="video/webm"][codecs^="vp09"]',
  '[mimeType="video/webm"]',
  '[mimeType="video/mp4"]',
];

const DEFAULT_AUDIO_PRIORITIES = [
  '[mimeType="audio/mp4"]',
];

const STREAM_TYPES = ['audio', 'video'];

/**
 * Streams raw media data to the <video> element.
 */
export default class {
  constructor(videoEl, parser, opts = {}) {
    this.videoEl = videoEl;
    this.parser = parser;
    this.opts = opts;
    this.stream = {
      media: {
        baseURL: '/',
        representations: this.initRepresentations(),
        duration: this.parser.duration,
      },
      buffer: {
        throttled: false,
        throttleTimeout: null,
        healthyDuration: this.parser.minBufferTime,
        mediaSource: null,
        sourceBuffers: {
          audio: null,
          video: null,
        },
      },
      measuredDownlink: null,
    };

    if (this.opts.manifestSrc) {
      const manifestURL = new URL(this.opts.manifestSrc);
      this.stream.media.baseURL = `${manifestURL.origin}${manifestURL.pathname.replace(/[^/]+$/, '')}`;
    }

    this.initializeBuffer().then(() => {
      this.observeVideoUpdates();
    });
  }

  getDownlink() {
    return this.stream.measuredDownlink
      || navigator.connection?.downlink
      || 10; // Assume broadband if we don't know.
  }

  observeVideoUpdates() {
    this.videoEl.addEventListener('timeupdate', () => {
      if (!this.stream.buffer.throttled) this.bufferAhead();
    });
  }

  getRepresentationMimeString(representation) {
    return representation.mimeType && representation.codecs
      ? `${representation.mimeType}; codecs="${representation.codecs}"`
      : `${representation.mimeType}`;
  }

  getRepresentationsByBandwidth() {
    const representations = {
      audio: this.stream.media.representations.audio[0] || null,
      video: null,
    };
    const downlinkInBits = this.getDownlink() * 1000000;
    let usedBandwidth = 0;

    if (representations.audio) {
      usedBandwidth += parseInt(representations.audio.bandwidth || 200000, 10);
    }
    representations.video = this.stream.media.representations.video.reduce(
      (previous, current) => {
        const currentBandwidth = parseInt(current.bandwidth, 10);
        const previousBandwidth = parseInt(previous.bandwidth, 10);

        const currentIsHigherQuality = currentBandwidth > previousBandwidth;
        const currentFitsDownlink = (currentBandwidth + usedBandwidth) < downlinkInBits;

        return (currentIsHigherQuality && currentFitsDownlink) ? current : previous;
      },
      this.stream.media.representations.video[0],
    );
    return representations;
  }

  initRepresentations() {
    const canPlayFilter = (representation) => {
      const testMime = this.getRepresentationMimeString(representation);
      return this.videoEl.canPlayType(testMime) === 'probably';
    };

    const representations = {};
    const priorities = {
      video: this.getOpt('videoPriorities') || DEFAULT_VIDEO_PRIORITIES,
      audio: this.getOpt('audioPriorities') || DEFAULT_AUDIO_PRIORITIES,
    };

    /**
     * Select sets of video and audio representations that are playable
     * in the client with respect to indicated priorities.
     */
    STREAM_TYPES.forEach(
      (contentType) => {
        let query;
        do {
          query = priorities[contentType].shift() || '';

          /**
           * @todo Support languages other than the hardcoded English.
           */
          representations[contentType] = this.parser.queryRepresentations(query, contentType, 'eng');
          representations[contentType] = representations[contentType].filter(canPlayFilter);
          if (representations[contentType]) break;
        } while (query);
      },
    );

    if (representations.video.length === 0) {
      throw new Error('[Streamer] No playable video representation found.');
    }

    return representations;
  }

  getOpt(name, defaultValue = null) {
    return this.opts[name] || defaultValue;
  }

  setOpt(name, value) {
    this.opts[name] = value;
  }

  throttleBuffer() {
    this.stream.buffer.throttled = true;
    this.stream.buffer.throttleTimeout = setTimeout(() => {
      this.stream.buffer.throttled = false;
    }, 500);
  }

  unthrottleBuffer() {
    if (this.stream.buffer.throttleTimeout) {
      clearTimeout(this.stream.buffer.throttleTimeout);
      this.stream.buffer.throttleTimeout = null;
    }
  }

  initializeBuffer() {
    return new Promise((resolve) => {
      this.stream.buffer.mediaSource = new MediaSource();
      this.videoEl.src = URL.createObjectURL(this.stream.buffer.mediaSource);

      this.stream.buffer.mediaSource.addEventListener('sourceopen', (e) => {
        const mediaSource = e.target;
        STREAM_TYPES.forEach((type) => {
          if (this.stream.media.representations[type].length) {
            const mimeString = this.getRepresentationMimeString(
              this.stream.media.representations[type][0],
            );
            this.stream.buffer.sourceBuffers[type] = mediaSource.addSourceBuffer(mimeString);
            /**
             * const representations = this.getRepresentationsByBandwidth();
             * console.log(representations);
             */
          }
        });
        resolve();
      });
    });
  }

  bufferAhead() {
    // const currentPlaybackTime = this.videoEl.currentTime;
    this.throttleBuffer();
  }
}
