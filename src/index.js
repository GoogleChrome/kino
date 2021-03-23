/**
 * Router, Connection utils.
 */
import Router from './js/classes/Router';
import VideoDownloaderRegistry from './js/classes/VideoDownloaderRegistry';
import ConnectionStatus from './js/classes/ConnectionStatus';

/**
 * Web Components implementation.
 */
import VideoPlayer from './js/web-components/VideoPlayer/VideoPlayer';
import VideoCard from './js/web-components/VideoCard/VideoCard';
import VideoDownloader from './js/web-components/VideoDownloader/VideoDownloader';
import VideoGrid from './js/web-components/VideoGrid/VideoGrid';
import ToggleButton from './js/web-components/ToggleButton/ToggleButton';
import OfflineToggleButton from './js/web-components/OfflineToggleButton/OfflineToggleButton';
import ProgressRing from './js/web-components/ProgressRing/ProgressRing';

/**
 * Pages.
 */
import HomePage from './js/pages/Home';
import VideoPage from './js/pages/Video';
import CategoryPage from './js/pages/Category';
import DownloadsPage from './js/pages/Downloads';
import SettingsPage from './js/pages/Settings';

/**
 * Settings
 */
import { loadSetting } from './js/utils/settings';
import { SETTING_KEY_TOGGLE_OFFLINE } from './js/constants';

/**
 * Custom Elements definition.
 */
customElements.define('video-player', VideoPlayer);
customElements.define('video-card', VideoCard);
customElements.define('video-downloader', VideoDownloader);
customElements.define('video-grid', VideoGrid);
customElements.define('toggle-button', ToggleButton);
customElements.define('offline-toggle-button', OfflineToggleButton);
customElements.define('progress-ring', ProgressRing);

/**
 * Tracks the connection status of the application and broadcasts
 * when the connections status changes.
 */
const offlineForced = loadSetting(SETTING_KEY_TOGGLE_OFFLINE) || false;
const connectionStatus = new ConnectionStatus(offlineForced);
const offlineBanner = document.querySelector('#offline-banner');

/**
 * Allow the page styling to respond to the global connection status.
 *
 * If an alert is emitted, slide in the "Not connected" message to inform
 * the user the action they attempted can't be performed right now.
 */
connectionStatus.subscribe(
  ({ navigatorStatus, alert }) => {
    document.body.dataset.connection = navigatorStatus;

    if (alert && navigatorStatus === 'offline') {
      offlineBanner.classList.add('alert');
      setTimeout(() => offlineBanner.classList.remove('alert'), 600);
    }
  },
);

/**
 * Initialize a registry holding instances of the `VideoDownload` web components.
 *
 * This is to allow us to share these instances between pages.
 */
const videoDownloaderRegistry = new VideoDownloaderRegistry({ connectionStatus });

/**
 * Bind the offline toggle(s) to the `ConnectionStatus` instance.
 */
[...document.querySelectorAll('offline-toggle-button')].forEach(
  (button) => button.assignConnectionStatus(connectionStatus),
);

/**
 * Router setup.
 */
const router = new Router({
  videoDownloaderRegistry,
  connectionStatus,
});
router.route('^/settings/?', SettingsPage);
router.route('^/downloads/?', DownloadsPage);
router.route('^/category/([^/]*)/?', CategoryPage);
router.route('^/?$', HomePage);

/**
 * Consider all else a single video page.
 */
router.route('.*', VideoPage);

/**
 * Register Service Worker.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
