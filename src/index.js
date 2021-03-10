/**
 * Router, Connection utils.
 */
import Router from './js/modules/Router.module';
import updateOnlineStatus from './js/utils/updateOnlineStatus';
import initializeGlobalToggle from './js/utils/initializeGlobalToggle';
import VideoDownloaderRegistry from './js/modules/VideoDownloaderRegistry.module';

/**
 * Web Components implementation.
 */
import VideoPlayerComponent from './js/components/VideoPlayer';
import VideoCardComponent from './js/components/VideoCard';
import VideoDownloaderComponent from './js/components/VideoDownloader';
import VideoGrid from './js/components/VideoGrid';
import ToggleButton from './js/components/ToggleButton';
import ProgressRing from './js/components/ProgressRing';

/**
 * Pages.
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
customElements.define('progress-ring', ProgressRing);

/**
 * Initialize a registry holding instances of the `VideoDownload` web components.
 *
 * This is to allow us to share these instances between pages.
 */
const videoDownloaderRegistry = new VideoDownloaderRegistry();

/**
 * Router setup.
 */
const router = new Router({ videoDownloaderRegistry });
router.route('/', HomePage);
router.route('/settings', SettingsPage);
router.route('/downloads', DownloadsPage);
router.route(RegExp('/category/(.*)'), CategoryPage);
router.route('*', VideoPage);

/**
 * Register Service Worker.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

/**
 * Connection status.
 */
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

initializeGlobalToggle();
