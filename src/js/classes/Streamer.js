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

import '../typedefs';
import selectRepresentations from '../utils/selectRepresentations';
import getRepresentationMimeString from '../utils/getRepresentationMimeString';

/**
 * What maximum percentage of total frames are OK to be dropped for us to still
 * consider the playback experience acceptable?
 */
const HEALTHY_PERCENTAGE_OF_DROPPED_FRAMES = 0;

/**
 * How many samples of dropped frames percentages do we consider when determining
 * whether the playback experience is acceptable or not.
 */
const DROPPED_FRAMES_PERCENTAGE_SAMPLE_SIZE = 3;

/**
 * How often should the video quality metrics be sampled in miliseconds.
 */
const VIDEO_QUALITY_SAMPLING_RATE = 1000;

/**
 * Streams raw media data to the <video> element through a MediaSource container.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
 */
export default class {
  /**
   * @param {HTMLVideoElement} videoEl Video element.
   * @param {ParserMPD}        parser  MPD parser instance.
   * @param {object}           opts    Options.
   */
  constructor(videoEl, parser, opts = {}) {
    this.videoEl = videoEl;
    this.parser = parser;
    this.opts = opts;

    this.stream = {
      media: {
        baseURL: '/',
        streamTypes: [],
        representations: [],
        lastRepresentationsIds: {},
        lastRepresentationSwitch: 0,
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
      videoQuality: {
        last: {
          totalFrames: 0,
          droppedFrames: 0,
        },
        droppedPercentages: [],
        intervalId: null,
        enforcedBandwidthSmallerThan: Number.MAX_SAFE_INTEGER,
      },
    };

    this.stream.media.baseURL = parser.baseURL;

    /**
     * Measure real downlink speeds.
     */
    document.body.addEventListener('downlink', (e) => {
      const downlinkInBits = e.detail;
      const sample = {
        size: 7,
        discardSlowest: 1, // Smooth out random dips in download speeds.
        discardFastest: 2, // Small chunks can lead to higher download speeds reported.
      };

      this.stream.downlink.entries.unshift(downlinkInBits);
      this.stream.downlink.entries = this.stream.downlink.entries.slice(0, sample.size);

      // Make sure we have large enough sample size to draw any conclusions.
      if (this.stream.downlink.entries.length === sample.size) {
        /**
         * Sort and remove extremes.
         */
        const entriesSortedAsc = [...this.stream.downlink.entries].sort((a, b) => a - b);
        const entriesWithoutExtremes = entriesSortedAsc.slice(
          sample.discardSlowest,
          sample.size - sample.discardFastest,
        );

        /**
         * Rolling average of last entries without the extremes.
         */
        this.stream.downlink.value = entriesWithoutExtremes.reduce(
          (a, b) => a + b,
          entriesWithoutExtremes[0],
        ) / entriesWithoutExtremes.length;
      }
    });

    this.initializeStream();
  }

  /**
   * Figures out which representations are best to be used on a current device.
   */
  async initializeRepresentations() {
    this.stream.media.representations = await selectRepresentations(this.parser, this.opts);

    // Iterate which stream types we have separate representations for.
    this.stream.media.streamTypes = Object.keys(this.stream.media.representations);
  }

  /**
   * Initializes all the differents parts of the stream.
   */
  async initializeStream() {
    await this.initializeRepresentations();

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
        if (!this.stream.buffer.mediaSource) {
          this.stream.buffer.mediaSource = e.target;
          this.stream.buffer.mediaSource.duration = this.stream.media.duration;
        }
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
      const mimeString = getRepresentationMimeString(representations[streamType][0]);
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

    // Sample when media is playing back.
    this.videoEl.addEventListener('play', this.startVideoQualitySampling.bind(this));

    // Don't sample when media stalls for any reason.
    this.videoEl.addEventListener('ended', this.stopVideoQualitySampling.bind(this));
    this.videoEl.addEventListener('emptied', this.stopVideoQualitySampling.bind(this));
    this.videoEl.addEventListener('pause', this.stopVideoQualitySampling.bind(this));
    this.videoEl.addEventListener('waiting', this.stopVideoQualitySampling.bind(this));
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
   * Get a combination of video and audio media representations
   * that will fit currently available bandwidth.
   *
   * @todo Select appropriate audio, too.
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

    /**
     * Don't allow a representation switch more often than every 5 seconds.
     */
    const lastSwitchedBefore = Date.now() - this.stream.media.lastRepresentationSwitch;
    const lockRepresentationFor = 5000;

    const lastVideoRepId = this.stream.media.lastRepresentationsIds.video;
    const lastVideoRepresentation = this.stream.media.representations.video.find(
      (videoObj) => videoObj.id === lastVideoRepId,
    );

    const droppedPercentageMin = this.stream.videoQuality.droppedPercentages.length > 0
      ? Math.min(...this.stream.videoQuality.droppedPercentages)
      : 0;

    /**
     * Playback is healthy when the percentage of dropped frames is not constantly
     * higher than our threshold.
     *
     * We also consider the playback healthy if we don't have enough `videoQuality` data yet.
     */
    const isPlaybackHealthy = (
      droppedPercentageMin <= HEALTHY_PERCENTAGE_OF_DROPPED_FRAMES
      || this.stream.videoQuality.droppedPercentages.length < DROPPED_FRAMES_PERCENTAGE_SAMPLE_SIZE
    );

    /**
     * If the playback is not healthy, enforce the next representation bandwidth
     * to be smaller than the current one and clear video quality data.
     */
    if (!isPlaybackHealthy && lastVideoRepresentation) {
      this.stream.videoQuality.enforcedBandwidthSmallerThan = parseInt(
        lastVideoRepresentation.bandwidth,
        10,
      );
      this.stream.videoQuality.droppedPercentages = [];
    }

    if (lastSwitchedBefore < lockRepresentationFor) {
      representations.video = lastVideoRepresentation;
      return representations;
    }

    const downlinkInBits = this.getDownlink() * 1000000;
    let usedBandwidth = 0;

    if (representations.audio) {
      usedBandwidth += parseInt(representations.audio.bandwidth || 200000, 10);
    }

    let candidateVideoRepresentations = this.stream.media.representations.video.filter(
      (representation) => (
        parseInt(
          representation.bandwidth,
          10,
        ) < this.stream.videoQuality.enforcedBandwidthSmallerThan
      ),
    );

    /**
     * If no video representations fit the allowed bandwidth, we need to only pick
     * the one with the smallest bitrate.
     */
    if (candidateVideoRepresentations.length === 0) {
      candidateVideoRepresentations = [
        this.stream.media.representations.video.reduce(
          (carry, representation) => (
            parseInt(carry.bandwidth, 10) < parseInt(representation.bandwidth, 10)
              ? carry
              : representation
          ),
        ),
      ];
    }

    /**
     * From all video representations, pick the best quality one that
     * still fits the available bandwidth.
     */
    representations.video = candidateVideoRepresentations.reduce(
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
    );

    return representations;
  }

  /**
   * Get a value from options passed to the Streamer constructor.
   *
   * @param {string} name         Name of the option to be retrived.
   * @param {*}      defaultValue Value returned if the option doesn't exist.
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
              const minSizeForDownlinkMeasurement = 10000;
              if (data && data.length >= minSizeForDownlinkMeasurement) {
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
   * Returns health information about the provided buffer.
   *
   * @param {SourceBuffer} buffer SourceBuffer to determine health for.
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
    const {
      baseURL,
      streamTypes,
      lastRepresentationsIds,
    } = this.stream.media;

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
        this.stream.media.lastRepresentationSwitch = Date.now();
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

  /**
   * Starts video quality sampling using the Video Playback Quality API.
   *
   * @returns {void}
   */
  startVideoQualitySampling() {
    if (this.stream.videoQuality.intervalId) return;
    this.stream.videoQuality.intervalId = setInterval(
      this.sampleVideoQuality.bind(this), VIDEO_QUALITY_SAMPLING_RATE,
    );
  }

  /**
   * Stop video quality sampling using the Video Playback Quality API.
   *
   * @returns {void}
   */
  stopVideoQualitySampling() {
    if (!this.stream.videoQuality.intervalId) return;
    clearInterval(this.stream.videoQuality.intervalId);
    this.stream.videoQuality.intervalId = null;
  }

  /**
   * Check the video playback quality metrics provided by Video Playback Quality API
   * and store the current numbers.
   */
  sampleVideoQuality() {
    const vq = this.videoEl.getVideoPlaybackQuality();

    /**
     * In case the internal counter used by `getVideoPlaybackQuality` resets
     * for any reason, we need to make sure our latest numbers are never
     * higher than what we're returned.
     */
    const droppedFramesSinceLastSample = (
      vq.droppedVideoFrames >= this.stream.videoQuality.last.droppedFrames
    )
      ? vq.droppedVideoFrames - this.stream.videoQuality.last.droppedFrames
      : vq.droppedVideoFrames;

    const totalFramesSinceLastSample = (
      vq.totalVideoFrames >= this.stream.videoQuality.last.totalFrames
    )
      ? vq.totalVideoFrames - this.stream.videoQuality.last.totalFrames
      : vq.totalVideoFrames;

    this.stream.videoQuality.last = {
      droppedFrames: vq.droppedVideoFrames,
      totalFrames: vq.totalVideoFrames,
    };

    if (totalFramesSinceLastSample > 0) {
      this.stream.videoQuality.droppedPercentages.push(
        (droppedFramesSinceLastSample) / totalFramesSinceLastSample,
      );
    }

    const droppedPercentagesCount = this.stream.videoQuality.droppedPercentages.length;
    if (droppedPercentagesCount > DROPPED_FRAMES_PERCENTAGE_SAMPLE_SIZE) {
      this.stream.videoQuality.droppedPercentages.shift();
    }
  }
}
