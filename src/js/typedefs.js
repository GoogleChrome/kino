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

/**
 * @typedef  {object}      VideoMeta
 * @property {string}      videoId         Identifier for the video.
 * @property {boolean}     done            If all video files are downloaded.
 */

/**
 * @typedef  {object}      FileMeta
 * @property {string}      url             Resource URL.
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
 * @property {Array}       apiData     Video and category metadata information from the API.
 * @property {HTMLElement} mainContent Elements representing the main content area in the page.
 * @property {Function}    navigate    Method to navigate between pages.
 * @property {string}      path        Current URL path.
 * @property {VideoDownloaderRegistry} VideoDownloaderRegistry Storage for `videoDownload`
 *                                                             instances reuse.
 */

/* eslint-disable max-len */
/**
 * @typedef  {object} BackgroundFetchRecord
 * @property {Request} request Request.
 * @property {Promise<Response>} responseReady Returns a promise that resolves with a Response.
 */

/**
 * @callback BgFetchMatch
 * @param {Request} request The Request for which you are attempting to find records.
 * @param {object}  options An object that sets options for the match operation.
 * @returns {BackgroundFetchRecord} Background fetch record.
 */

/**
 * @callback BgFetchAbort
 * @returns {Promise<boolean>} Whether the background fetch was successfully aborted.
 */

/**
 * @callback BgFetchMatchAll
 * @param {Request} request The Request for which you are attempting to find records.
 * @param {object}  options An object that sets options for the match operation.
 * @returns {Promise<BackgroundFetchRecord[]>} Promise that resolves with an array of BackgroundFetchRecord objects.
 */

/**
 * @typedef  {object} BackgroundFetchRegistration
 * @property {string} id containing the background fetch's ID.
 * @property {number} uploadTotal containing the total number of bytes to be uploaded.
 * @property {number} uploaded containing the size in bytes successfully sent, initially 0.
 * @property {number} downloadTotal containing the total size in bytes of this download.
 * @property {number} downloaded containing the size in bytes that has been downloaded, initially 0.
 * @property {""|"aborted"|"bad-status"|"fetch-error"|"quota-exceeded"|"download-total-exceeded"} failureReason Failure reason.
 * @property {boolean} recordsAvailable indicating whether the recordsAvailable flag is set.
 * @property {BgFetchMatch} match Returns a single BackgroundFetchRecord object which is the first match for the arguments.
 * @property {BgFetchMatchAll} matchAll Returns a Promise that resolves with an array of BackgroundFetchRecord objects containing requests and responses.
 * @property {BgFetchAbort} abort Aborts the background fetch. Returns a Promise that resolves with true if the fetch was successfully aborted.
 */
/* eslint-enable max-len */

/**
 * @callback DownloadFlushHandler
 * @param {FileMeta}  fileMeta  File meta.
 * @param {FileChunk} fileChunk File chunk.
 * @param {boolean}   isDone    Is this the last downloaded piece?
 * @returns {void}
 */
