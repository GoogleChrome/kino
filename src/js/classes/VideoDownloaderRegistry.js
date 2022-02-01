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

import VideoDownloader from '../web-components/video-download/VideoDownloader';

/**
 * The `VideoDownloader` web component contains a download method that is potentially
 * long running. This registry allows different pages to share a single `VideoDownloader`
 * instance per videoId.
 *
 * This helps maintain the component's state even across page loads.
 */
export default class VideoDownloaderRegistry {
  constructor({ connectionStatus }) {
    this.instances = new Map();
    this.connectionStatus = connectionStatus;

    if (document) {
      document.addEventListener('pausedownload', this.onPauseDownload.bind(this));
    }
  }

  /**
   * Creates a new `VideoDownloader` instance for the given `videoId`.
   *
   * @param {string} videoId   Video ID.
   * @returns {VideoDownloader} Instantiated VideoDownloader.
   */
  create(videoId) {
    this.instances.set(videoId, new VideoDownloader({ connectionStatus: this.connectionStatus }));

    return this.instances.get(videoId);
  }

  /**
   * Returns a previously instantiated VideoDownloader.
   *
   * @param {string} videoId Get the `VideoDownloader` instance for this video id.
   * @returns {VideoDownloader|null} `VideoDownloader` instance.
   */
  get(videoId) {
    return this.instances.get(videoId) || null;
  }

  /**
   * Returns an iterator over all stored instances.
   *
   * @returns {Iterator<string, VideoDownloader>} Iterator over all VideoDownloader instance.
   */
  getAll() {
    return this.instances.entries();
  }

  /**
   * Detaches the `VideoDownload` instances and leaves them to be
   * garbage collected.
   */
  destroyAll() {
    this.instances.clear();
  }

  /**
   * When a pause request is received, we need to pause the download.
   *
   * @param {CustomEvent} e Pause event.
   * @param {string} e.detail Video ID.
   */
  onPauseDownload(e) {
    const downloaderInstance = this.get(e.detail);

    if (downloaderInstance) {
      downloaderInstance.downloading = false;
    }
  }
}
