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

import appendVideoToGallery from '../utils/appendVideoToGallery';
import VideoPlayer from '../web-components/video-player/VideoPlayer';
import { SW_CACHE_NAME } from '../constants';

/**
 * Icons.
 */
import unmuteIcon from '../../images/icons/unmute.svg';
import playIcon from '../../images/icons/play.svg';

/**
 * Creates a button to be rendered over the video area.
 *
 * @param {object} options            Button options.
 * @param {string} options.markup     Button markup.
 * @param {string} options.action     Action ID.
 * @param {Function} options.callback Callback.
 * @returns {HTMLButtonElement} Created button.
 */
const createOverlayButton = ({ markup, action, callback }) => {
  const buttonElement = document.createElement('button');

  buttonElement.classList.add(`action--${action}`);
  buttonElement.addEventListener('click', callback);
  buttonElement.innerHTML = markup;

  return buttonElement;
};

/**
 * Sets up the VideoDownloader instance for the current video.
 *
 * @param {object}                  videoData                             Current video data.
 * @param {object}                  routerContext                         Router context object.
 * @param {VideoDownloaderRegistry} routerContext.videoDownloaderRegistry Downloader registry.
 * @returns {VideoDownloader} Downloader instance.
 */
const setupDownloader = (videoData, { videoDownloaderRegistry }) => {
  let downloader = videoDownloaderRegistry.get(videoData.id);
  if (!downloader) {
    downloader = videoDownloaderRegistry.create(videoData.id);
    downloader.init(videoData, SW_CACHE_NAME);
  }
  downloader.setAttribute('expanded', 'true');

  return downloader;
};

/**
 * Returns the video poster markup.
 *
 * @param {object}         videoData           Video data.
 * @param {string}         videoData.title     Video title.
 * @param {(string|Array)} videoData.thumbnail Video thumbnail, either a string or an array.
 * @returns {string} String containing an <img> or <picture> element.
 */
const getPosterMarkup = ({ title, thumbnail }) => {
  if (!Array.isArray(thumbnail)) {
    return `<img src="${thumbnail}" width="1200" height="675" alt="${title}">`;
  }

  const sources = thumbnail.filter((t) => !t.default).map((t) => `<source srcset="${t.src}" type="${t.type}">`).join('');
  const defaultSource = thumbnail.find((t) => t.default);
  const defaultSourceHTML = `<img src="${defaultSource.src}" width="1200" height="675" alt="${title}">`;

  return `<picture>${sources}${defaultSourceHTML}</picture>`;
};

/**
 * Parse the video data returned by the API and extract the current video data.
 *
 * @param {object} routerContext         Router context.
 * @param {object} routerContext.apiData All API data.
 * @param {string} routerContext.path    Current path.
 * @returns {Array} Array containing the current video data and the rest of videos data.
 */
const extractVideoData = ({ apiData, path }) => apiData.videos.reduce(
  (returnValue, videoMeta) => {
    if (path.includes(`/${videoMeta.id}`)) {
      returnValue[0] = videoMeta;
    } else {
      returnValue[1].push(videoMeta);
    }
    return returnValue;
  },
  [null, []],
);

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    apiData,
    connectionStatus,
  } = routerContext;

  const [currentVideoData, restVideoData] = extractVideoData(routerContext);
  const downloader = setupDownloader(currentVideoData, routerContext);
  const [videoMinutes, videoSeconds] = currentVideoData.length.split(':');

  /**
   * Returns whether the current video is available for playback.
   *
   * @param {object} downloaderOrState             Downloader instance or state object.
   * @param {string} downloaderOrState.state       Downloader state string, e.g. "done".
   * @param {boolean} downloaderOrState.willremove Downloader willremove flag.
   * @returns {boolean} Whether video is available for playback from any source (network or IDB).
   */
  const isVideoAvailable = (downloaderOrState) => connectionStatus.status !== 'offline' // We're are not offline...
    || downloaderOrState.state === 'done' // ... or we have the video downloaded
    || downloaderOrState.willremove === true; // ... or we're about to remove it, but haven't yet.

  mainContent.innerHTML = `
    <div class="container">
      <article class="video-article ${isVideoAvailable(downloader) ? '' : 'video--disabled'}">
        <div class="video-container width-full">
          <div class="video-container--overlay"></div>
          <div class="video-container--player"></div>
        </div>
        <div class="video-content">
          <h1>${currentVideoData.title}</h1>
          <div class="info">
            <span class="date">${currentVideoData.date}</span> • <span class="length">${videoMinutes}min ${videoSeconds}sec</span>
          </div>
          <p>${currentVideoData.description}</p>
          <p><span class="downloader"></span></p>
          ${currentVideoData.body}
        </div>
      </article>
    </div>
  `;

  mainContent.querySelector('.downloader').appendChild(downloader);

  const containerEl = mainContent.querySelector('.video-container');
  const overlayEl = containerEl.querySelector('.video-container--overlay');

  /**
   * Creates a new video player component that renders a custom
   * <video-player> element, which encapsulates all logic
   * around rendering the native <video> element.
   *
   * @returns {Promise} Promise that rejects when the video can't be played right now.
   */
  const attachAndPlay = () => {
    const playerWrapper = containerEl.querySelector('.video-container--player');
    const videoPlayer = new VideoPlayer(downloader);

    containerEl.classList.add('has-player');
    videoPlayer.render(currentVideoData);
    playerWrapper.appendChild(videoPlayer);

    return videoPlayer.play();
  };

  /**
   * Renders an overlay layer with a button, optionally also adding any custom markup.
   *
   * @param {string}            options               Render options.
   * @param {string}            options.markup        Default markup to be rendered as an overlay.
   * @param {HTMLButtonElement} options.buttonElement Markup to be rendered as an overlay.
   */
  const renderOverlay = ({ buttonElement, markup = '' }) => {
    overlayEl.innerHTML = markup;
    overlayEl.appendChild(buttonElement);

    containerEl.classList.add('has-overlay');
  };

  /**
   * Clears the overlay layer.
   */
  const clearOverlay = () => {
    containerEl.classList.remove('has-overlay');
  };

  /**
   * Sets up the manual play button.
   */
  const setupManualPlayButton = () => {
    renderOverlay({
      buttonElement: createOverlayButton({
        markup: playIcon,
        action: 'play',
        callback: async () => {
          attachAndPlay();
          clearOverlay();
        },
      }),
      markup: getPosterMarkup(currentVideoData),
    });
  };

  /**
   * Sets up the unmute button.
   *
   * @param {VideoPlayer} videoPlayer Video player instance.
   */
  const setupUnmuteButton = (videoPlayer) => {
    renderOverlay({
      buttonElement: createOverlayButton({
        markup: `${unmuteIcon} Tap to unmute`,
        action: 'unmute',
        callback: () => {
          videoPlayer.unmute();
          clearOverlay();
        },
      }),
    });
  };

  /**
   * Handle the autoplay setting.
   */
  if (!currentVideoData.autoplay) {
    setupManualPlayButton();
  } else {
    /**
     * Error handler for when we are disallowed to play the video right away.
     *
     * @param {VideoPlayer} videoPlayer Video player component instance.
     */
    const errHandler = (videoPlayer) => {
      // If auto playback fails, mute the video and retry.
      videoPlayer.mute();
      videoPlayer.play()
        .then(() => setupUnmuteButton(videoPlayer)) // Can play muted, display unmute button.
        .catch(setupManualPlayButton); // Can't play automatically at all, setup manual play button.
    };

    // Attempt autoplay.
    attachAndPlay().catch(errHandler);
  }

  downloader.subscribe((oldState, newState) => {
    const articleEl = mainContent.querySelector('.video-article');

    if (isVideoAvailable(newState)) {
      articleEl.classList.remove('video--disabled');
    } else {
      articleEl.classList.add('video--disabled');
    }
  });

  const categorySlug = currentVideoData.categories[0];
  const { name, slug } = apiData.categories.find((obj) => obj.slug === categorySlug);
  const localContext = {
    category: `${name}:${slug}`,
    columns: 2,
  };

  const categoryVideos = restVideoData.filter(
    (obj) => obj.categories.includes(categorySlug),
  ).slice(0, 2);

  appendVideoToGallery({
    ...routerContext,
    apiData: {
      videos: categoryVideos,
      categories: apiData.categories,
    },
  }, localContext);
};
