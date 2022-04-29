/**
 * Copyright 2021 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SETTING_KEY_DARK_MODE, SETTING_KEY_BG_FETCH_API } from '../constants';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    connectionStatus,
  } = routerContext;

  const backgroundFetchSettingMarkup = !('BackgroundFetchManager' in window)
    ? ''
    : `<div class="settings--option">
    <div class="setting--option__icon">
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"><path d="M12 4.34v11.127M16.081 19.66H7.919M7.919 11.386 12 15.467M16.081 11.386 12 15.467" fill="none" stroke="var(--accent)" stroke-width="1.5"/></svg>
    </div>
    <div>
      <p class="setting--option__title">Download videos in the background</p>
      <p class="setting--option__desc">Use Background Fetch API to download videos in the background.</p>
    </div>
    <toggle-button setting="${SETTING_KEY_BG_FETCH_API}"></toggle-button>
  </div>`;

  mainContent.innerHTML = `<div class="container settings">
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
      ${backgroundFetchSettingMarkup}
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
