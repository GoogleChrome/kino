/**
 * @typedef  {object}      VideoMeta
 * @property {string}      videoId         Identifier for the video.
 * @property {boolean}     done            If all video files are downloaded.
 */

/**
 * @typedef  {object}      FileMeta
 * @property {string}      url             The original resource URL.
 * @property {string}      downloadUrl     Rewritten resource URL.
 * @property {string}      videoId         Identifier for the video this file is associated with.
 * @property {string}      mimeType        File MIME type.
 * @property {number}      bytesDownloaded Total bytes downloaded of the resources.
 * @property {number|null} bytesTotal      Total size of the resource or `null` if unknown.
 * @property {boolean}     done            If the file is done downloading.
 */

/**
 * @typedef  {object}     FileChunk
 * @property {string}     url        URL the file was downloaded from.
 * @property {number}     rangeStart Byte index of the start of the range covered by data.
 * @property {number}     rangeEnd   Byte index of the end of the range covered by data.
 * @property {Uint8Array} data       Chunk data.
 */

/**
 * @typedef  {object}  RepresentationObject
 * @property {string}  id                    Representation ID.
 * @property {string}  mimeType              Representation MIME type.
 * @property {string}  codecs                Representation codec.
 * @property {string}  bandwidth             Bandwidth in bits required to play media.
 * @property {string}  width                 [Video] Width of the video frame.
 * @property {string}  height                [Video] Height of the video frame.
 * @property {string}  frameRate             [Video] Framerate.
 * @property {string}  audioSamplingRate     [Audio] Audio sampling rate.
 * @property {Element} element               The <Representation> element.
 * @property {number}  maxChunkIndex         The last media chunk index.
 */

/**
 * @typedef  {object}  healthResult
 * @property {boolean} isHealthy      Whether the `heathyDuration` of the buffer is loaded ahead.
 * @property {number}  bufferEndTime  The end time of the current buffer range ahead.
 */

/**
 * @typedef {object}  videoSource
 * @property {string} src  Source URL.
 * @property {string} type Source MIME type.
 */

/**
 * @typedef  {object}  videoSourceInfo
 * @property {string}  src                 Source URL.
 * @property {string}  type                Source MIME type.
 * @property {boolean} isStream            Is the returned source streamed video?
 * @property {string}  canPlayTypeNatively Can the client play the source natively or using MSE?
 * @property {string}  canPlayTypeMSE      Can the client natively play the returned source?
 */

/**
 * @typedef  {object} VideoDownloaderRegistry
 * @property {Function} create      Creates a new `VideoDownload` instance.
 * @property {Function} get         Returns a previously created `VideoDownload` instance or null.
 * @property {Function} getAll      Returns an iterator over all `VideoDownload` instances.
 * @property {Function} destroyAll  Detaches all `VideoDownload` instances, clears the registry.
 * @property {object}   instances   Holds `VideoDownload` instances keyed by video IDs.
 */

/**
 * @typedef  {object}      RouterContext
 * @property {Array}       apiData     Array of sets of video metadata information from the API.
 * @property {HTMLElement} mainContent Elements representing the main content area in the page.
 * @property {Function}    navigate    Method to navigate between pages.
 * @property {string}      path        Current URL path.
 * @property {VideoDownloaderRegistry} VideoDownloaderRegistry Storage for `videoDownload`
 *                                                             instances reuse.
 */
