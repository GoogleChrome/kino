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
import { STREAMING_MIME_TYPES, SUPPORTED_STREAMING_MIME_TYPES } from '../constants';

/**
 * Returns information related to a single source.
 *
 * @param {videoSource}      source  Source information from the API.
 * @param {HTMLVideoElement} videoEl Video element.
 * @returns {videoSourceInfo} Information about the source.
 */
function getSourceInfo(source, videoEl) {
  const clientSupportsMSE = 'MediaSource' in window;
  const isStream = STREAMING_MIME_TYPES.includes(source.type);
  const canPlayTypeNatively = videoEl.canPlayType(source.type);
  const canPlayTypeMSE = isStream
    && clientSupportsMSE
    && SUPPORTED_STREAMING_MIME_TYPES.includes(source.type)
    ? 'probably' : '';

  return {
    ...source,
    isStream,
    canPlayTypeNatively,
    canPlayTypeMSE,
  };
}

/**
 * Returns the first source that is likely playable by the current client.
 *
 * @param {videoSource[]}    sources Array of video source objects.
 * @param {HTMLVideoElement|null} videoEl Video element.
 * @returns {videoSourceInfo|null} First source that likely is playable by the current client.
 */
export default (sources, videoEl = null) => {
  const videoElement = videoEl || document.createElement('video');
  const sourceInfos = sources.map((source) => getSourceInfo(source, videoElement));
  const appropriateSource = sourceInfos.find(
    (sourceInfo) => sourceInfo.canPlayTypeNatively === 'probably' || sourceInfo.canPlayTypeMSE === 'probably',
  );

  if (appropriateSource) {
    return appropriateSource;
  }

  const maybeAppropriateSource = sourceInfos.find(
    (sourceInfo) => sourceInfo.canPlayTypeNatively === 'maybe',
  ) || null;
  return maybeAppropriateSource;
};
