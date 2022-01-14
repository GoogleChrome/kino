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
import getURLsForDownload from './getURLsForDownload';
import getIDBConnection from '../classes/IDBConnection';

/**
 * Returns a list of URLs that need to be downloaded in order to allow
 * offline playback of this resource on this device.
 *
 * @param {string}   videoId      Video ID.
 * @param {string[]} [urls]       Optionally a list of URLs to be downloaded.
 * @returns {Promise<FileMeta[]>} List of FileMeta objects associated with the given `videoId`.
 */
export default async (videoId, urls = null) => {
  const db = await getIDBConnection();
  const dbFiles = await db.file.getByVideoId(videoId);
  const dbFilesUrlTuples = dbFiles.map((fileMeta) => [fileMeta.url, fileMeta]);
  const dbFilesByUrl = Object.fromEntries(dbFilesUrlTuples);

  if (!urls) {
    urls = await getURLsForDownload(videoId);
  }

  /**
   * If we have an entry for this file in the database, use it. Otherwise
   * fall back to the freshly generated FileMeta object.
   */
  return urls.map(
    (fileUrl) => (dbFilesByUrl[fileUrl] ? dbFilesByUrl[fileUrl] : {
      url: fileUrl,
      videoId,
      mimeType: 'application/octet-stream', // Filled in by `DownloadManager` later.
      bytesDownloaded: 0,
      bytesTotal: null, // Filled in by `DownloadManager` later.
      done: false,
    }),
  );
};
