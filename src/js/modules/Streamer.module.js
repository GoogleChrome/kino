const DEFAULT_VIDEO_PRIORITIES = [
  '[mimeType="video/webm"][codecs^="vp09"]',
  '[mimeType="video/webm"]',
  '[mimeType="video/mp4"]',
];

const DEFAULT_AUDIO_PRIORITIES = [
  '[mimeType="audio/mp4"]',
];

/**
 * Streams raw media data to the <video> element.
 */
export default class {
  constructor(videoEl, parser, opts = {}) {
    this.videoEl = videoEl;
    this.parser = parser;
    this.opts = opts;

    try {
      this.setDownlink(navigator.connection.downlink);
      navigator.connection.onchange = () => {
        this.setDownlink(navigator.connection.downlink);
      };
    } catch (_) {
      this.setDownlink(10);
    }

    this.representations = this.initRepresentations();
  }

  initRepresentations() {
    const canPlayFilter = (representation) => {
      const testMime = representation.mimeType && representation.codecs
        ? `${representation.mimeType}; codecs="${representation.codecs}"`
        : `${representation.mimeType}`;

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
    ['video', 'audio'].forEach(
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

    this.representations = representations;
  }

  /**
   * Sets the current downlink bandwidth.
   *
   * @param {number} downlinkInMBits Currently detected downlink bandwidth in MBits per second.
   */
  setDownlink(downlinkInMBits) {
    this.downlink = downlinkInMBits;
  }

  getOpt(name, defaultValue = null) {
    return this.opts[name] || defaultValue;
  }

  setOpt(name, value) {
    this.opts[name] = value;
  }
}
