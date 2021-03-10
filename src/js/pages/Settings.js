import { saveSetting, loadSetting } from '../utils/settings';

const onChange = (key) => ({ detail }) => {
  saveSetting(key, detail.value);
};

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const { mainContent } = routerContext;
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
<!--      <div class="option">-->
<!--        <toggle-button></toggle-button>-->
<!--        <div>-->
<!--          <h4>Prefetch popular content</h4>-->
<!--          <p>When enabled, the app will periodically prefetch the first portion ofpopular content. This means that you when you want to watch videoit can begin playback immediately without buffering. Please note:this feature will use bandwidth.</p>-->
<!--        </div>-->
<!--      </div>-->
    </div>
  `;
  const toggleButtonOffline = mainContent.querySelector('toggle-button#offline-content-only');
  toggleButtonOffline.addEventListener('change', onChange('offline-content-only'));

  // TODO: Listen for global toggle change and sync this local setting?
  // Should we enable and gray-out that option while offline?
  // +auto enable when going offline on this page?
  const isOffline = !navigator.onLine;
  if (loadSetting('offline-content-only') || isOffline) {
    toggleButtonOffline.checked = true;
  }
};
