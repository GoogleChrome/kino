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

import { loadSetting, saveSetting, removeSetting } from '../../utils/settings';
import { SETTING_KEY_TOGGLE_OFFLINE } from '../../constants';

import ToggleButton from '../toggle-button/ToggleButton';

/**
 * Respond to button interaction.
 *
 * @param {boolean}          forceOffline     Force the offline state.
 * @param {ConnectionStatus} connectionStatus ConnectionStatus instance.
 */
const buttonInteractionHandler = (forceOffline, connectionStatus) => {
  if (forceOffline) {
    saveSetting(SETTING_KEY_TOGGLE_OFFLINE, true);
    connectionStatus.forceOffline();
  } else if (connectionStatus.getStatusDetail().navigatorStatus === 'offline') {
    /**
     * If we want to leave offline mode, but we're not online, let's
     * prevent the action and broadcast a "Not connected" alert instead.
     */
    connectionStatus.alert();
  } else {
    removeSetting(SETTING_KEY_TOGGLE_OFFLINE);
    connectionStatus.unforceOffline();
  }
};

/**
 * Respond to connection status changes.
 *
 * @param {HTMLElement}      button           The toggle button element.
 * @param {ConnectionStatus} connectionStatus ConnectionStatus instance.
 */
const networkChangeHandler = (button, connectionStatus) => {
  const offlineModeEnabled = loadSetting(SETTING_KEY_TOGGLE_OFFLINE);

  if (offlineModeEnabled) {
    button.checked = true;
  } else {
    button.checked = (connectionStatus.status === 'offline');
  }
};

/**
 * The offline toggle button is a special case of a toggle button
 * in a sense that it accepts and uses a `connectionStatus`
 * instance to help drive its logic.
 */
export default class OfflineToggleButton extends ToggleButton {
  constructor() {
    super();
    this.initialized = false;
  }

  /**
   * We override default toggling logic with custom implementation.
   */
  setNewToggleState() {}

  /**
   * @param {ConnectionStatus} connectionStatus ConnectionStatus instance.
   */
  assignConnectionStatus(connectionStatus) {
    if (this.initialized) return;

    /**
     * On button interaction, we want to persist the state if it's
     * based on user gesture.
     */
    this.$checkbox.addEventListener('change', (e) => {
      const forceOffline = (e.target.checked === true);
      buttonInteractionHandler(forceOffline, connectionStatus);
    });

    /**
     * Respond to network changes.
     */
    connectionStatus.subscribe(
      () => networkChangeHandler(this.$checkbox, connectionStatus),
    );

    this.initialized = true;
  }
}
