const DEFAULT_VIDEO_PRIORITIES = [
  '[mimeType="video/webm"][codecs^="vp09"]',
  '[mimeType="video/webm"]',
  '[mimeType="video/mp4"]',
];

const DEFAULT_AUDIO_PRIORITIES = [
  '[mimeType="audio/mp4"]',
];

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
      measuredDownlink: null,
    };

    // Iterate which stream types we have separate representations for.
    this.stream.media.streamTypes = Object.keys(this.stream.media.representations);

    if (this.opts.manifestSrc) {
      const manifestURL = new URL(this.opts.manifestSrc);
      this.stream.media.baseURL = `${manifestURL.origin}${manifestURL.pathname.replace(/[^/]+$/, '')}`;
    }

    this.initializeStream();
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
    this.videoEl.addEventListener('seeking', () => {
      this.unthrottleBuffer();
      this.bufferAhead();
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
    this.stream.buffer.throttled = false;
    if (this.stream.buffer.throttleTimeout) {
      clearTimeout(this.stream.buffer.throttleTimeout);
      this.stream.buffer.throttleTimeout = null;
    }
  }

  async initializeStream() {
    await this.initializeMediaSource();
    this.initializeBuffers();
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

  initializeSourceBuffer(mimeString) {
    const sourceBuffer = this.stream.buffer.mediaSource.addSourceBuffer(mimeString);
    sourceBuffer.dataQueue = {
      internal: {
        entries: [],
        updating: false,
      },
      append(data) {
        this.internal.entries.push(data);
        if (!this.internal.updating) {
          this.step();
        }
      },
      step() {
        const data = this.internal.entries.shift();
        if (data) {
          this.internal.updating = true;
          sourceBuffer.appendBuffer(data);
        }
      },
    };

    sourceBuffer.fileQueue = {
      internal: {
        files: [],
        bufferedFiles: new Set(),
        reading: false,
      },
      add(fileObj) {
        if (!fileObj.force && this.internal.bufferedFiles.has(fileObj.id)) return;

        this.internal.files.push(fileObj.url);
        this.internal.bufferedFiles.add(fileObj.id);

        if (!this.internal.reading) this.step();
      },
      step() {
        const filename = this.internal.files.shift();
        if (!filename) return;

        this.internal.reading = true;
        fetch(filename).then((response) => response.body).then(
          async (body) => {
            const reader = body.getReader();
            const readChunk = async () => {
              const { value, done } = await reader.read();
              return [value, done];
            };

            let data;
            let done;

            /* eslint-disable no-await-in-loop */
            do {
              [data, done] = await readChunk(); // await here is fine, the process is sequential.
              if (!done) sourceBuffer.enqueueAppendBuffer(data);
            } while (!done);
            /* eslint-enable no-await-in-loop */

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
    sourceBuffer.enqueueAppendBuffer = sourceBuffer.dataQueue.append.bind(sourceBuffer.dataQueue);
    sourceBuffer.enqueueFile = sourceBuffer.fileQueue.add.bind(sourceBuffer.fileQueue);

    return sourceBuffer;
  }

  initializeBuffers() {
    const { streamTypes, representations } = this.stream.media;

    streamTypes.forEach((streamType) => {
      const mimeString = this.getRepresentationMimeString(representations[streamType][0]);
      this.stream.buffer.sourceBuffers[streamType] = this.initializeSourceBuffer(mimeString);
    });

    this.bufferAhead();
  }

  getBufferHealth(buffer) {
    const currentPlaybackTime = this.videoEl.currentTime;
    const { healthyDuration } = this.stream.buffer;
    const bufferedTimeRanges = buffer.buffered;

    let bufferLeft = 0;
    let bufferEndTime = currentPlaybackTime;

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
