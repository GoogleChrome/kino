import { loadSetting, saveSetting, setHeaderToggle } from './settings';

const onChange = (key) => ({ detail }) => {
  saveSetting(key, !detail.value);
  window.dispatchEvent(new CustomEvent(`${!detail.value ? 'offline' : 'online'}-mock`));
};

/**
 * Update online status for header toggle
 */
function updateOnlineStatus() {
  const toggleButtonOffline = document.querySelector('header toggle-button#offline-content-only');
  toggleButtonOffline.checked = navigator.onLine;
}

/**
 * Initialize the offline/online toggle from the header.
 */
export default function initializeGlobalToggle() {
  if (loadSetting('header-toggle')) {
    setHeaderToggle();

    const toggleButtonOffline = document.querySelector('header toggle-button#offline-content-only');
    toggleButtonOffline.addEventListener('change', onChange('offline-content-only'));

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Should we enable and gray-out that option while offline?
    // +auto enable when going offline on this page?
    const isOnline = navigator.onLine;
    if (!loadSetting('offline-content-only') || isOnline) {
      toggleButtonOffline.checked = true;
    }
  }
}
