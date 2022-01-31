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
import api from '../../../public/api.json';

/**
 * Rewrite a source URL based on from and to parameters.
 *
 * Useful for rewriting manifest file URLs, because the offline versions
 * of manifests only contain a single video representation.
 *
 * @param {string} videoId   Video ID.
 * @param {string} sourceUrl Source URL to find offline alternative for.
 * @param {string} from      From which key.
 * @param {string} to        To which key.
 * @returns {string} A rewritten URL.
 */
export default function rewriteURL(videoId, sourceUrl, from, to) {
  const videoData = api.videos.find((video) => video.id === videoId);

  if (!videoData) {
    return sourceUrl;
  }

  if (videoData['url-rewrites']) {
    videoData['url-rewrites'].forEach((rewrite) => {
      if (rewrite[from] === sourceUrl) {
        sourceUrl = rewrite[to];
      }
    });
  }
  return sourceUrl;
}
