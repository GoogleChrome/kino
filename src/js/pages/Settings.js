import { saveSetting, loadSetting, setHeaderToggle } from '../utils/settings';

const onChange = (key) => ({ detail }) => {
  saveSetting(key, detail.value);
};

export default ({ mainContent }) => {
  mainContent.innerHTML = `
    <div class="page-title">
        <h2>Settings</h2>
        <img src="/images/arrow-down.svg" alt="" />
    </div>
    <div class="settings">
      <div class="option">
        <toggle-button id="offline-content-only"></toggle-button>
        <div>
          <h4>Show offline content only</h4>
          <p>When enabled, you will only be shown content that is available offline.</p>
        </div>
      </div>
      <div class="option">
        <toggle-button id="header-toggle"></toggle-button>
        <div>
          <h4>Show offline toggle</h4>
          <p>When enabled, connection status toggle (offline/online mode) will be shown in header.</p>
        </div>
      </div>
    </div>
  `;
  const toggleButtonOffline = mainContent.querySelector('toggle-button#offline-content-only');
  const toggleButtonHeader = mainContent.querySelector('toggle-button#header-toggle');

  toggleButtonOffline.addEventListener('change', onChange('offline-content-only'));
  toggleButtonHeader.addEventListener('change', (e) => {
    onChange('header-toggle')(e);
    setHeaderToggle();
  });

  // TODO: Listen for global toggle change and sync this local setting?
  // Should we enable and gray-out that option while offline?
  // +auto enable when going offline on this page?
  const isOffline = !navigator.onLine;
  if (loadSetting('offline-content-only') || isOffline) {
    toggleButtonOffline.checked = true;
  }

  if (loadSetting('header-toggle')) {
    toggleButtonHeader.checked = true;
  }
};
