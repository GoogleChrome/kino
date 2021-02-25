/**
 * Some video types and codecs leads to smaller file sizes
 * for comparable video qualities.
 *
 * If the client supports those, we want to prioritize those sources
 * over the others available in the MPD manifest.
 */
const DEFAULT_VIDEO_PRIORITIES = [
  '[mimeType="video/webm"][codecs^="vp09"]',
  '[mimeType="video/webm"]',
  '[mimeType="video/mp4"]',
];

/**
 * Same for audio, but right now we have no real preference here.
 */
const DEFAULT_AUDIO_PRIORITIES = [
  '[mimeType="audio/mp4"]',
];

/**
 * A stream can be composed from multiple media, e.g. video, audio, subtitles etc.
 *
 * These are all the types the Streamer has support for.
 */
const ALL_STREAM_TYPES = ['audio', 'video'];

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
        streamTypes: [],
        representations: this.initRepresentations(),
        lastRepresentationsIds: {},
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
      downlink: {
        value: null,
        entries: [],
      },
    };

    // Iterate which stream types we have separate representations for.
    this.stream.media.streamTypes = Object.keys(this.stream.media.representations);

    /**
     * Define a base URL for the files referenced in the manifest file.
     */
    const manifestSrc = this.getOpt('manifestSrc');
    if (manifestSrc) {
      const manifestURL = new URL(manifestSrc);
      const manifestPathDir = manifestURL.pathname.replace(/[^/]+$/, ''); // Strip trailing filename.

      this.stream.media.baseURL = `${manifestURL.origin}${manifestPathDir}`;
    }

    /**
     * Measure real downlink speeds.
     */
    document.body.addEventListener('downlink', (e) => {
      const downlinkInBits = e.detail;
      let downlinkEntries = this.stream.downlink.entries;

      downlinkEntries.unshift(downlinkInBits);
      downlinkEntries = downlinkEntries.slice(0, 10);

      this.stream.downlink.entries = downlinkEntries;

      // Make sure we have large enough sample size to draw any conclusions.
      if (downlinkEntries.length === 10) {
        this.stream.downlink.value = downlinkEntries.reduce(
          (a, b) => a + b,
          downlinkEntries[0],
        ) / downlinkEntries.length;
      }
    });

    this.initializeStream();
  }

  /**
   * Initializes all the differents parts of the stream.
   */
  async initializeStream() {
    /**
     * Create and attach a `MediaSource` element.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaSource
     */
    await this.initializeMediaSource();

    /**
     * Create, extend and attach the `SourceBuffer` objects.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer
     */
    this.initializeBuffers();

    /**
     * Respond to video playback and seek operations to buffer enough data
     * ahead at any point.
     */
    this.observeVideoUpdates();
  }

  /**
   * Initializes the Media Source and appends it to a video element.
   *
   * @returns {Promise} Promise that resolves with opened MediaSource instance.
   */
  initializeMediaSource() {
    const mediaSource = new MediaSource();
    this.videoEl.src = URL.createObjectURL(mediaSource);

    return new Promise((resolve) => {
      mediaSource.addEventListener('sourceopen', (e) => {
        this.stream.buffer.mediaSource = e.target;
        this.stream.buffer.mediaSource.duration = this.stream.media.duration;
        resolve();
      });
    });
  }

  /**
   * Initialize a `SourceBuffer` for each component of the stream,
   * e.g. one for video, one for audio.
   */
  initializeBuffers() {
    const { streamTypes, representations } = this.stream.media;

    streamTypes.forEach((streamType) => {
      const mimeString = this.getRepresentationMimeString(representations[streamType][0]);
      this.stream.buffer.sourceBuffers[streamType] = this.initializeSourceBuffer(mimeString);
    });

    this.bufferAhead();
  }

  /**
   * Observes the video player for `currentTime` updates and add more data
   * to the buffer if necessary.
   */
  observeVideoUpdates() {
    this.videoEl.addEventListener('timeupdate', () => {
      if (!this.stream.buffer.throttled) this.bufferAhead();
    });
    this.videoEl.addEventListener('seeking', () => {
      this.unthrottleBuffer();
      this.bufferAhead();
    });
  }

  /**
   * Returns a reported or measured downlink capacity in MBits per second.
   *
   * @returns {number} Reported or measured downlink capacity in MBits per second.
   */
  getDownlink() {
    let navigatorDownlink;
    if (navigator.connection) {
      navigatorDownlink = navigator.connection.downlink;
    }
    return this.stream.downlink.value
      || navigatorDownlink
      || 10; // Assume broadband if we really don't know.
  }

  /**
   * Returns the MIME type for a representation.
   *
   * @param {object} representation Information about the representation.
   *
   * @returns {string} MIME type, optionally with codecs string, too.
   */
  getRepresentationMimeString(representation) {
    return representation.mimeType && representation.codecs
      ? `${representation.mimeType}; codecs="${representation.codecs}"`
      : `${representation.mimeType}`;
  }

  /**
   * Get a combination of video and audio media representations
   * that will fit currently available bandwidth.
   *
   * @todo Select appropriate audio, too.
   *
   * @returns {object} Selected `video` and `audio` representations.
   */
  getRepresentationsByBandwidth() {
    const representations = {
      /*
       * Right now, if we have any `audio` representations, we just pick the first one,
       * because audio isn't really too much data.
       */
      audio: this.stream.media.representations.audio[0] || null,
      video: null,
    };
    const downlinkInBits = this.getDownlink() * 1000000;
    let usedBandwidth = 0;

    if (representations.audio) {
      usedBandwidth += parseInt(representations.audio.bandwidth || 200000, 10);
    }

    /**
     * From all video representations, pick the best quality one that
     * still fits the available bandwidth.
     */
    representations.video = this.stream.media.representations.video.reduce(
      (previous, current) => {
        const currentBandwidth = parseInt(current.bandwidth, 10);
        const previousBandwidth = parseInt(previous.bandwidth, 10);

        const currentIsHigherQuality = currentBandwidth > previousBandwidth;
        const currentFitsDownlink = (currentBandwidth + usedBandwidth) <= downlinkInBits;
        const previousDoesntFitDownlink = (previousBandwidth + usedBandwidth) > downlinkInBits;
        const currentIsLessData = currentBandwidth < previousBandwidth;

        if (currentIsHigherQuality && currentFitsDownlink) return current;
        if (previousDoesntFitDownlink && currentIsLessData) return current;
        return previous;
      },
      this.stream.media.representations.video[0],
    );
    return representations;
  }

  /**
   * Fetch all representations present in the MPD file and filter
   * those that the current client can't play out.
   *
   * @returns {object[]} All representations that the current client is able to play.
   */
  initRepresentations() {
    /**
     * Returns whether the provided representation is playable by the current client.
     *
     * @param {object} representation Representation object returned by parser.queryRepresentations.
     *
     * @returns {boolean} Is this representation playable by the current client.
     */
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
    ALL_STREAM_TYPES.forEach(
      (contentType) => {
        let query;
        do {
          query = priorities[contentType].shift() || '';

          /**
           * @todo Support languages other than the hardcoded English.
           */
          representations[contentType] = this.parser.queryRepresentations(query, contentType, 'eng');
          representations[contentType] = representations[contentType].filter(canPlayFilter);
        } while (!representations[contentType]);
      },
    );

    if (representations.video.length === 0) {
      throw new Error('[Streamer] No playable video representation found.');
    }

    return representations;
  }

  /**
   * Get a value from options passed to the Streamer constructor.
   *
   * @param {string} name         Name of the option to be retrived.
   * @param {*}      defaultValue Value returned if the option doesn't exist.
   *
   * @returns {*} Option value.
   */
  getOpt(name, defaultValue = null) {
    return this.opts[name] || defaultValue;
  }

  /**
   * Sets an option value.
   *
   * @param {string} name   Name of the option to be used for storage.
   * @param {*}      value  Value to be stored.
   */
  setOpt(name, value) {
    this.opts[name] = value;
  }

  /**
   * "Locks" buffering for 0.5 second.
   */
  throttleBuffer() {
    this.stream.buffer.throttled = true;
    this.stream.buffer.throttleTimeout = setTimeout(() => {
      this.stream.buffer.throttled = false;
    }, 500);
  }

  /**
   * "Unlocks" buffering.
   */
  unthrottleBuffer() {
    this.stream.buffer.throttled = false;
    if (this.stream.buffer.throttleTimeout) {
      clearTimeout(this.stream.buffer.throttleTimeout);
      this.stream.buffer.throttleTimeout = null;
    }
  }

  /**
   * Initializes and returns a SourceBuffer.
   *
   * Also extends it with `dataQueue` and `fileQueue` objects that
   * simplify pumping chunks of data into them.
   *
   * @param {string} mimeString Mime string for the SourceBuffer.
   *
   * @returns {SourceBuffer} Initialized `SourceBuffer`.
   */
  initializeSourceBuffer(mimeString) {
    const sourceBuffer = this.stream.buffer.mediaSource.addSourceBuffer(mimeString);

    /**
     * The `dataQueue` object simplifies pumping binary data into the buffer. It makes
     * sure the buffer is always done writing previous chunk of data before another
     * append request takes place.
     */
    sourceBuffer.dataQueue = {
      internal: {
        entries: [],
        updating: false,
      },

      /**
       * Appends data to the buffer.
       *
       * @param {Uint8Array} data Data.
       */
      append(data) {
        this.internal.entries.push(data);
        if (!this.internal.updating) {
          this.step();
        }
      },

      /**
       * Buffer is ready to accept more data. Check the internal queue to see
       * if we have more data lined up.
       */
      step() {
        const data = this.internal.entries.shift();
        if (data) {
          this.internal.updating = true;
          sourceBuffer.appendBuffer(data);
        }
      },
    };

    /**
     * The `fileQueue` object simplifies loading chunk files into the `SourceBuffer`.
     *
     * It internally tracks all files already added to the buffer and refuses adding
     * them twice unless that operation is forced.
     *
     * It also implements a way to access the file chunks and pump data out of them
     * through to the `dataQueue` in the order of addition.
     */
    sourceBuffer.fileQueue = {
      internal: {
        files: [],
        bufferedFiles: new Set(),
        reading: false,
      },

      /**
       * Adds a file to be appended to the buffer.
       *
       * @param {object}  fileObj        File object.
       * @param {boolean} fileObj.force  Force the file to the buffer even if we appended it before.
       * @param {string}  fileObj.url    URL of the chunk to be appended to the buffer.
       * @param {string}  fileObj.id     ID of the file to be appended.
       */
      add(fileObj) {
        if (!fileObj.force && this.internal.bufferedFiles.has(fileObj.id)) return;

        this.internal.files.push(fileObj.url);
        this.internal.bufferedFiles.add(fileObj.id);

        if (!this.internal.reading) this.step();
      },

      /**
       * Check if the previous read and write is finished and if yes,
       * get the next file in queue and process that.
       */
      step() {
        const filename = this.internal.files.shift();
        if (!filename) return;

        this.internal.reading = true;
        fetch(filename).then((response) => response.body).then(
          async (body) => {
            /**
             * @see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader
             */
            const reader = body.getReader();
            const readChunk = async () => {
              const { value, done } = await reader.read();
              return [value, done];
            };

            let data;
            let done;

            do {
              const startTime = performance.now();

              /* eslint-disable no-await-in-loop */
              [data, done] = await readChunk(); // await here is fine, the process is sequential.
              /* eslint-enable no-await-in-loop */

              /**
               * Report on real downlink speeds.
               *
               * @todo Make this more robust.
               *
               * Maybe cancel chunk loading if it takes too long and swap for lower quality in place
               */
              if (data) {
                const elapsedInSecons = (performance.now() - startTime) / 1000;
                const downlinkInBits = Math.round((data.length / elapsedInSecons) * 8);
                const downlinkInMBits = downlinkInBits / 1000000;
                const downlinkEvent = new CustomEvent('downlink', {
                  detail: downlinkInMBits,
                });
                document.body.dispatchEvent(downlinkEvent);
              }

              if (!done) sourceBuffer.enqueueAppendBuffer(data);
            } while (!done);

            this.internal.reading = false;
            this.step();
          },
        );
      },
    };

    sourceBuffer.addEventListener('updateend', (e) => {
      e.target.dataQueue.internal.updating = false;
      e.target.dataQueue.step();
    });

    /**
     * Expose public methods to avoid using `dataQueue` and `fileQueue` directly.
     */
    sourceBuffer.enqueueAppendBuffer = sourceBuffer.dataQueue.append.bind(sourceBuffer.dataQueue);
    sourceBuffer.enqueueFile = sourceBuffer.fileQueue.add.bind(sourceBuffer.fileQueue);

    return sourceBuffer;
  }

  /**
   * @typedef {object} healthResult
   * @property {boolean} isHealthy      Whether the `heathyDuration` of the buffer is loaded ahead.
   * @property {number}  bufferEndTime  The end time of the current buffer range ahead.
   */

  /**
   * Returns health information about the provided buffer.
   *
   * @param {SourceBuffer} buffer SourceBuffer to determine health for.
   *
   * @returns {healthResult} Health result of the provided source buffer.
   */
  getBufferHealth(buffer) {
    const currentPlaybackTime = this.videoEl.currentTime;
    const { healthyDuration } = this.stream.buffer;
    const bufferedTimeRanges = buffer.buffered;

    let bufferLeft = 0;
    let bufferEndTime = currentPlaybackTime;

    /**
     * Find the buffered time range the playback is currently in if there is one.
     */
    for (let i = 0; i < bufferedTimeRanges.length; i += 1) {
      const start = bufferedTimeRanges.start(i);
      const end = bufferedTimeRanges.end(i);

      if (currentPlaybackTime >= start && currentPlaybackTime <= end) {
        bufferLeft = end - currentPlaybackTime;
        bufferEndTime = end;
      }
    }

    return {
      isHealthy: bufferLeft >= healthyDuration,
      bufferEndTime,
    };
  }

  /**
   * Inspects buffer health and loads more upcoming data to the buffer
   * if the amount of data in the buffer is considered unhealthy low.
   */
  bufferAhead() {
    this.throttleBuffer();

    const currentRepresentations = this.getRepresentationsByBandwidth();
    const { baseURL, streamTypes, lastRepresentationsIds } = this.stream.media;

    streamTypes.forEach((streamType) => {
      const buffer = this.stream.buffer.sourceBuffers[streamType];
      const bufferHealth = this.getBufferHealth(buffer);

      if (bufferHealth.isHealthy) {
        return;
      }

      const representation = currentRepresentations[streamType];
      const chunkIndex = representation.getSegmentIndexByTime(bufferHealth.bufferEndTime);

      if (!chunkIndex) {
        return;
      }

      const lastRepresentationId = lastRepresentationsIds[streamType];
      const filesToBuffer = [];

      /**
       * If we switch between representations mid-stream, we need to inject a so-called
       * initialization chunk again to indicate the parameters of the data ahead changed.
       */
      if (representation.id !== lastRepresentationId) {
        filesToBuffer.push({
          id: `initial-${representation.id}`,
          url: `${baseURL}${representation.getInitialSegment()}`,
          force: true,
        });
      }
      this.stream.media.lastRepresentationsIds[streamType] = representation.id;

      const chunkIndicesToLoad = [chunkIndex];
      if (chunkIndex < representation.maxChunkIndex) {
        chunkIndicesToLoad.push(chunkIndex + 1);
      }

      chunkIndicesToLoad.forEach(
        (index) => {
          filesToBuffer.push({
            id: index,
            url: `${baseURL}${representation.getSegmentByIndex(index)}`,
          });
        },
      );

      filesToBuffer.map(
        (fileObj) => buffer.enqueueFile(fileObj),
      );
    });
  }
}
