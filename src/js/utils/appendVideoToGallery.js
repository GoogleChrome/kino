import { SW_CACHE_NAME } from '../constants';

function appendVideoToGallery(videoDataArray, navigate, category, mainContent, index) {
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
    card.shadowRoot.querySelector('.downloader').appendChild(downloader);
    player.render(videoData);
    videoGallery.appendChild(card);
  });

  // videoGallery.appendChild(player);
  mainContent.appendChild(videoGrid);
}

export default appendVideoToGallery;
