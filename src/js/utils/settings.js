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

/**
 * @param {string} key Setting key.
 * @param {*} value Value.
 */
export function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

/**
 * @param {string} key Setting key.
 * @returns {*} Value converted to JS Object.
 */
export function loadSetting(key) {
  return JSON.parse(localStorage.getItem(key));
}

/**
 * Removes a settings entry.
 *
 * @param {string} key Setting key.
 */
export function removeSetting(key) {
  localStorage.removeItem(key);
}
