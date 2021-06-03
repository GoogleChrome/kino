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

import getDownloaderElement from './getDownloaderElement';

/**
 * @param {RouterContext} routerContext Context passed through by Router.
 * @param {object}        localContext  Additional data needed by this method.
 */
function appendVideoToGallery(routerContext, localContext) {
  const {
    videoDownloaderRegistry,
    apiData,
    navigate,
    mainContent,
    connectionStatus,
  } = routerContext;

  const videoGrid = document.createElement('video-grid');
  videoGrid.category = localContext.category || '';
  videoGrid.setAttribute('class', localContext.class || 'flex');

  const videoCards = videoGrid.shadowRoot.querySelector('.video-cards');
  const videoGallery = videoGrid.shadowRoot.querySelector('.video-cards ul');

  videoCards.classList.add(localContext.columns === 2 ? 'col-2' : 'col-3');

  apiData.videos.forEach((videoData) => {
    const item = document.createElement('li');
    const card = document.createElement('video-card');
    const downloader = getDownloaderElement(videoDownloaderRegistry, videoData);

    card.render({
      videoData,
      navigate,
      connectionStatus,
      downloader,
    });

    item.appendChild(card);
    videoGallery.appendChild(item);
  });

  mainContent.appendChild(videoGrid);
}

export default appendVideoToGallery;
