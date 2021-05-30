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

import getRepresentationMimeString from './getRepresentationMimeString';

import {
  DEFAULT_AUDIO_PRIORITIES,
  DEFAULT_VIDEO_PRIORITIES,
  ALL_STREAM_TYPES,
} from '../constants';

/**
 * Fetch all representations present in the MPD file and filter
 * those that the current client can't play out.
 *
 * @param {object} parser MPD parser instance.
 * @param {object} opts   Options.
 * @returns {object[]} All representations that the current client is able to play.
 */
export default (parser, opts = {}) => {
  const videoEl = document.createElement('video');
  /**
   * Returns whether the provided representation is playable by the current client.
   *
   * @param {object} representation Representation object returned by parser.queryRepresentations.
   * @returns {boolean} Is this representation playable by the current client.
   */
  const canPlayFilter = (representation) => {
    const testMime = getRepresentationMimeString(representation);
    return videoEl.canPlayType(testMime) === 'probably';
  };

  const representations = {};

  const priorities = {
    video: [...(opts.videoPriorities || DEFAULT_VIDEO_PRIORITIES)],
    audio: [...(opts.audioPriorities || DEFAULT_AUDIO_PRIORITIES)],
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

        representations[contentType] = parser.queryRepresentations(query, contentType);
        representations[contentType] = representations[contentType].filter(canPlayFilter);
      } while (representations[contentType].length === 0 && query);
    },
  );

  if (representations.video.length === 0) {
    throw new Error('[Streamer] No playable video representation found.');
  }

  return representations;
};
