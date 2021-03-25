import { SETTING_KEY_DARK_MODE } from '../constants';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    connectionStatus,
  } = routerContext;
  mainContent.innerHTML = `
    <style>
      .settings {
        margin-bottom: 4rem;
      }
      .settings .page-header {
        margin-bottom: 1.25rem;
      }
      .settings .page-header h1 {
        margin-bottom: 0;
      }
      .settings--option {
        border: 1px solid var(--separator);
        border-radius: 8px;
        margin-top: var(--gutter);
        padding: var(--gutter);
        text-align: center;
        width: calc(100% - calc(var(--gutter) * 2));
      }
      .setting--option__icon {
        align-items: center;
        background: var(--accent-background);
        border-radius: 50%;
        display: inline-block;
        height: 64px;
        justify-content: center;
        position: relative;
        width: 64px;
      }
      .setting--option__icon svg {
        position: absolute;
        top: calc(50% - 12px);
        left: calc(50% - 12px);
      }
      .settings--option .setting--option__title {
        color: var(--accent-text);
        font-weight: 500;
        font-size: 18px;
        line-height: 26px;
        margin-bottom: 0;
      }
      .settings--option .setting--option__desc {
        font-size: 14px;
        line-height: 25px;
        margin-top: 0.25rem;
        margin-bottom: 2rem;
      }
      @media (min-width: 720px) {
        .settings {
          margin-bottom: 4.5rem;
        }
        .settings .page-header {
          margin-bottom: 2rem;
        }
        .settings--option {
          display: grid;
          grid-template-columns: 88px 1fr 72px;
          text-align: left;
        }
        .settings--option .setting--option__title {
          margin-top: 0;
          box-sizing: border-box;
        }
        .settings--option .setting--option__desc {
          margin-bottom: 0;
        }
      }
      @media (min-width: 960px) {
        .settings {
          margin-bottom: 5rem;
        }
        .settings .page-header {
          margin-bottom: 3rem;
        }
        .settings--option {
          width: calc(63.333333333% - calc(var(--gutter) * 2));
        }
        toggle-button,
        offline-toggle-button {
          align-self: center;
          justify-self: center;
        }
      }
    </style>
    <div class="container settings">
      <header class="page-header">
        <h1>Settings</h1>
      </header>
      <div class="settings--option">
        <div class="setting--option__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="var(--accent)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M21.4446 15.7579C21.4446 19.336 19.336 21.4446 15.7579 21.4446H7.97173C4.38444 21.4446 2.27588 19.336 2.27588 15.7579V7.9626C2.27588 4.38444 3.59031 2.27588 7.16847 2.27588H9.16749C9.88576 2.27588 10.5621 2.61406 10.9931 3.18868L11.9059 4.40269C12.3378 4.97618 13.0135 5.31406 13.7315 5.31549H16.5611C20.1484 5.31549 21.472 7.14108 21.472 10.7923L21.4446 15.7579Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8.43994 13L10.8139 15.373L15.5599 10.627" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        </div>
        <div>
          <p class="setting--option__title">Show offline content only</p>
          <p class="setting--option__desc">When enabled, you will only be shown content that is available offline.</p>
        </div>
        <offline-toggle-button></offline-toggle-button>
      </div>
      <div class="settings--option">
        <div class="setting--option__icon">
          <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12h1M4.2 4.2l.7.7M12 1v1M19.8 4.2l-.7.7M23 12h-1M19.8 19.8l-.7-.7M12 23v-1M4.2 19.8l.7-.7M12 18a6 6 0 100-12 6 6 0 000 12z" stroke="var(--accent)" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div>
          <p class="setting--option__title">Dark mode</p>
          <p class="setting--option__desc">Force dark color scheme regardless of system settings.</p>
        </div>
        <toggle-button setting="${SETTING_KEY_DARK_MODE}"></toggle-button>
      </div>
<!--      <div class="settings--option">-->
<!--        <toggle-button></toggle-button>-->
<!--        <div>-->
<!--          <h4>Prefetch popular content</h4>-->
<!--          <p>When enabled, the app will periodically prefetch the first portion of popular content. This means that you when you want to watch videoit can begin playback immediately without buffering. Please note:this feature will use bandwidth.</p>-->
<!--        </div>-->
<!--      </div>-->
    </div>
  `;

  mainContent
    .querySelector('offline-toggle-button')
    .assignConnectionStatus(connectionStatus);
};
