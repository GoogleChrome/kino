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
