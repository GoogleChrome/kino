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

import styles from './VideoCard.css';

/**
 * When the connection status changes, enable or disable the card
 * with respect to the download state.
 *
 * @param {ConnectionStatus} connectionStatus ConnectionStatus instance.
 * @param {VideoDownloader}  downloader       `VideoDownloader` instance.
 */
function connectionStatusChangeHandler(connectionStatus, downloader) {
  if (connectionStatus.status === 'offline' && downloader.state !== 'done') {
    this.classList.add('disabled');
  } else {
    this.classList.remove('disabled');
  }
}

export default class VideoCard extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  render({
    videoData,
    connectionStatus,
    downloader,
  }) {
    const templateElement = document.createElement('template');
    let posterImage = videoData.thumbnail;

    if (Array.isArray(posterImage)) {
      posterImage = videoData.thumbnail.find((thumbnail) => thumbnail.default).src;
    }

    templateElement.innerHTML = `<style>${styles}</style>
        <a data-use-router class="video-card--image-link" href="/${videoData.id}/">
          <img class="video-card--image" src="${posterImage}" alt="${videoData.title}" />
        </a>
        <div class="video-card--content">
          <h2><a data-use-router href="/${videoData.id}/" class="video-card--title">${videoData.title}</a></h2>
          <div class="video-card--downloader"></div>
          <p class="video-card--summary">${videoData.description}</p>
        </div>
      `;

    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this._root.appendChild(ui);
    this._root.querySelector('.video-card--downloader').appendChild(downloader);

    const boundHandler = connectionStatusChangeHandler.bind(this, connectionStatus, downloader);

    /**
     * Whenever connection status or downloader state changes,
     * maybe disable / enable the card.
     */
    connectionStatus.subscribe(boundHandler);
    downloader.subscribe(boundHandler);
  }
}
