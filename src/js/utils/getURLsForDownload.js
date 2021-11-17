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
import ParserMPD from '../classes/ParserMPD';
import selectSource from './selectSource';
import getVideoSources from './getVideoSources';
import rewriteURL from './rewriteURL';

/**
 * Returns a list of URLs that need to be downloaded in order to allow
 * offline playback of this resource on this device.
 *
 * @param {string} videoId      Video ID.
 * @returns {Promise<string[]>} List of URLs associated with the given `videoId`.
 */
export default async (videoId) => {
  const videoSources = getVideoSources(videoId);
  const selectedSource = selectSource(videoSources);

  if (selectedSource === null) {
    return [];
  }

  let urls = [];

  /**
   * If this is a streamed video, we need to read the manifest
   * first and generate a list of files to be downloaded.
   */
  if (selectedSource?.canPlayTypeMSE) {
    const offlineManifestUrl = rewriteURL(videoId, selectedSource.src, 'online', 'offline');

    /**
     * Use the offline version of the manifest to make sure we only line up
     * a subset of all available media data for download.
     *
     * We don't want to download video files in all possible resolutions and formats.
     * Instead the offline manifest only contain one manually selected representation.
     */
    try {
      const response = await fetch(offlineManifestUrl);
      const responseText = await response.text();
      const parser = new ParserMPD(responseText, selectedSource.src);

      urls.push(selectedSource.src);
      urls = [...parser.listAllChunkURLs(), ...urls];
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('Error fetching and parsing the offline MPD manifest.', e);
    }
  } else {
    urls.push(selectedSource.src);
  }
  return urls;
};
