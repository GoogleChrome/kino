export default function updateOnlineStatus() {
  const status = document.getElementById('connection-status');
  const condition = navigator.onLine ? 'online' : 'offline';
  status.className = condition;
  status.innerHTML = condition;
}
