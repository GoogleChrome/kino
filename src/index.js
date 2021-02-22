/**
 * Router, Connection util
 */
import Router from './js/modules/Router.module';
import updateOnlineStatus from './js/utils/updateOnlineStatus';

/**
 * Web Components implementation.
 */
import VideoPlayerComponent from './js/components/VideoPlayer';
import VideoCardComponent from './js/components/VideoCard';
import VideoDownloaderComponent from './js/components/VideoDownloader';
import VideoGrid from './js/components/VideoGrid';
import ToggleButton from './js/components/ToggleButton';
import DownloadCard from './js/components/DownloadCard';

/**
 * Pages
 */
import HomePage from './js/pages/Home';
import VideoPage from './js/pages/Video';
import CategoryPage from './js/pages/Category';
import DownloadsPage from './js/pages/Downloads';
import SettingsPage from './js/pages/Settings';

/**
 * Custom Elements definition.
 */
customElements.define('video-player', VideoPlayerComponent);
customElements.define('video-card', VideoCardComponent);
customElements.define('video-downloader', VideoDownloaderComponent);
customElements.define('video-grid', VideoGrid);
customElements.define('toggle-button', ToggleButton);
customElements.define('download-card', DownloadCard);

/**
 * Video Application Logic
 */
const router = new Router();
router.route('/', HomePage);
router.route('/settings', SettingsPage);
router.route('/downloads', DownloadsPage);
router.route(RegExp('/category/(.*)'), CategoryPage);
router.route('*', VideoPage);

/**
 * Register Service Worker
 */
if (false && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

/**
 * Connection status
 */
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();
