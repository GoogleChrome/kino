/**
 * Shared constants.
 */
import { SW_CACHE_NAME } from './js/constants';

/**
 * Web Components implementation.
 */
import VideoPlayerComponent from './js/components/VideoPlayer';
import VideoCardComponent from './js/components/VideoCard';
import VideoDownloaderComponent from './js/components/VideoDownloader';

/**
 * Custom Elements definition.
 */
customElements.define('video-player', VideoPlayerComponent);
customElements.define('video-card', VideoCardComponent);
customElements.define('video-downloader', VideoDownloaderComponent);

/**
 * Video Application Logic
 */
const videoGallery = document.querySelector('.gallery');

/**
 * Build out the gallery view.
 */
fetch('api/video-list.json')
  .then((response) => response.json())
  .then((videoDataArray) => videoDataArray.forEach((videoData) => {
    const card = document.createElement('video-card');
    const downloader = document.createElement('video-downloader');
    const player = document.createElement('video-player');

    downloader.init(videoData, SW_CACHE_NAME);
    card.render(videoData);
    card.shadowRoot.appendChild(downloader);
    player.render(videoData);

    videoGallery.appendChild(card);
    videoGallery.appendChild(player);
  }));

/**
 * Register Service Worker
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

/**
 * Connection status
 */
function updateOnlineStatus() {
  const status = document.getElementById('connection-status');
  const condition = navigator.onLine ? 'online' : 'offline';
  status.className = condition;
  status.innerHTML = condition;
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();
