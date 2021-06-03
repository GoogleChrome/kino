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

import { SW_CACHE_NAME } from '../constants';

/**
 * Returns a `VideoDownloader` object for a given video ID.
 *
 * @param {VideoDownloaderRegistry} videoDownloaderRegistry Registry.
 * @param {object} videoData Video data.
 * @returns {VideoDownloader} `VideoDownloader` instance.
 */
export default (videoDownloaderRegistry, videoData) => {
  let downloader = videoDownloaderRegistry.get(videoData.id);
  if (!downloader) {
    downloader = videoDownloaderRegistry.create(videoData.id);
    downloader.init(videoData, SW_CACHE_NAME);
  }
  downloader.setAttribute('expanded', 'false');

  return downloader;
};
