import { SW_CACHE_NAME } from '../constants';

/**
 * @param {object[]} videoDataArray Array of video metadata objects.
 * @param {Function} navigate Navigate function.
 * @param {string} category Video category.
 * @param {HTMLElement} mainContent Main content DOM node.
 * @param {number} index Index of the gallery/section, for background purposes.
 */
function appendVideoToGallery(videoDataArray, navigate, category, mainContent, index = 0) {
  const videoGrid = document.createElement('video-grid');
  videoGrid.category = category;
  videoGrid.background = getComputedStyle(document.documentElement)
    .getPropertyValue(`--background-${index % 2 === 0 ? 'light' : 'dark'}`);
  const videoGallery = videoGrid.shadowRoot.querySelector('.grid');

  videoDataArray.forEach((videoData) => {
    const card = document.createElement('video-card');
    const downloader = document.createElement('video-downloader');
    const player = document.createElement('video-player');
    downloader.init(videoData, SW_CACHE_NAME);
    card.render(videoData, navigate);
    card.attachDownloader(downloader);
    player.render(videoData);
    videoGallery.appendChild(card);
  });

  mainContent.appendChild(videoGrid);
}

export default appendVideoToGallery;
