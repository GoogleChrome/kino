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

import api from '../../../public/api.json';

/**
 * Returns a list of videos sources associated with a video.
 *
 * @param {string} videoId Video ID.
 * @returns {videoSource[]} Video source objects.
 */
export default function getVideoSources(videoId) {
  const foundVideo = api.videos.find((video) => video.id === videoId);

  if (foundVideo) {
    return foundVideo['video-sources'];
  }
  return [];
}
