import { loadSetting, saveSetting } from './settings';

const onChange = (key) => ({ detail }) => {
  saveSetting(key, detail.value);
  window.dispatchEvent(new CustomEvent(`${detail.value ? 'offline' : 'online'}-mock`));
};

export default function initializeGlobalToggle() {
  const toggleButtonOffline = document.querySelector('header toggle-button#offline-content-only');
  toggleButtonOffline.addEventListener('change', onChange('offline-content-only'));

  // Should we enable and gray-out that option while offline?
  // +auto enable when going offline on this page?
  const isOffline = !navigator.onLine;
  if (loadSetting('offline-content-only') || isOffline) {
    toggleButtonOffline.checked = true;
  }
}
