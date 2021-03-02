import { saveSetting } from './settings';

export default function updateOnlineStatus() {
  const status = document.getElementById('connection-status');
  const condition = navigator.onLine ? 'online' : 'offline';
  status.className = condition;
  status.innerHTML = condition;

  // If we want to sync the setting with actual connection state
  saveSetting('offline-content-only', condition === 'offline');
}
