export function saveSetting(key, value) {
  localStorage.setItem(key, value);
}

export function loadSetting(key) {
  return JSON.parse(localStorage.getItem(key));
}
