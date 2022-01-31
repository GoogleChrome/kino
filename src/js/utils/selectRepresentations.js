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

import {
  DEFAULT_AUDIO_PRIORITIES,
  DEFAULT_VIDEO_PRIORITIES,
  ALL_STREAM_TYPES,
} from '../constants';
import getDecodingInfo from './getDecodingInfo';
import { getMediaConfigurationAudio, getMediaConfigurationVideo } from './getMediaConfiguration';

/**
 * Uses the Media Capabilities API to filter out media representations
 * that don't match the provided set of requirements.
 *
 * @param {Array}           representations Media representations.
 * @param {'audio'|'video'} contentType     Media type.
 * @param {Array}           requirements    Array of requirements for Media Capabilities API.
 * @returns {Promise<Array>} Set of representations matching the requirements.
 */
const selectRepresentationsByRequirements = async (
  representations,
  contentType,
  requirements = [
    {
      supported: true,
      smooth: true,
      powerEfficient: true,
    },
    {
      supported: true,
      smooth: true,
    },
    {
      supported: true,
    },
  ],
) => {
  // Strips away the first item from `requirements`, this allows us to call
  // this method recursively later.
  const currentRequirements = requirements.shift();
  const matchedRepresentations = [];

  for (const currentRepresentation of representations) {
    const mediaConfiguration = contentType === 'audio'
      ? getMediaConfigurationAudio(currentRepresentation)
      : getMediaConfigurationVideo(currentRepresentation);

    /* eslint-disable-next-line no-await-in-loop */
    const decodingInfo = await getDecodingInfo(mediaConfiguration);

    let matchesRequirements = true;
    Object.entries(currentRequirements).forEach(([key, value]) => {
      matchesRequirements = matchesRequirements && (decodingInfo[key] === value);
    });

    if (matchesRequirements) {
      matchedRepresentations.push(currentRepresentation);
    }
  }

  if (matchedRepresentations.length > 0) {
    return matchedRepresentations;
  }

  return requirements.length > 0
    ? selectRepresentationsByRequirements(representations, contentType, requirements)
    : [];
};

/**
 * Fetch all representations present in the MPD file and filter
 * those that the current client can't play out.
 *
 * @param {object} parser MPD parser instance.
 * @param {object} opts   Options.
 * @returns {Promise<object[]>} All representations that the current client is able to play.
 */
export default async (parser, opts = {}) => {
  const representations = {
    video: [],
    audio: [],
  };

  const priorities = {
    video: [...(opts.videoPriorities || DEFAULT_VIDEO_PRIORITIES)],
    audio: [...(opts.audioPriorities || DEFAULT_AUDIO_PRIORITIES)],
  };

  /**
   * Select sets of video and audio representations that are playable
   * in the client with respect to indicated priorities.
   */
  for (const contentType of ALL_STREAM_TYPES) {
    let query;

    do {
      query = priorities[contentType].shift() || '';
      const candidates = parser.queryRepresentations(query, contentType);

      /* eslint-disable-next-line no-await-in-loop */
      representations[contentType] = await selectRepresentationsByRequirements(
        candidates,
        contentType,
      );
    } while (representations[contentType].length === 0 && query);
  }

  if (representations.video.length === 0) {
    throw new Error('[Streamer] No playable video representation found.');
  }

  return representations;
};
