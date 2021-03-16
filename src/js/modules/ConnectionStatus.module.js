export default class ConnectionStatus {
  constructor(offlineForced = false) {
    this.internal = {
      status: navigator.onLine ? 'online' : 'offline',
      offlineForced,
      changeCallbacks: [],
    };

    window.addEventListener('online', () => {
      const oldStatus = this.status;
      this.internal.status = 'online';

      if (this.status !== oldStatus) this.broadcast();
    });

    window.addEventListener('offline', () => {
      const oldStatus = this.status;
      this.internal.status = 'offline';

      if (this.status !== oldStatus) this.broadcast();
    });
  }

  /**
   * Returns the connection status, optionally overriden by the
   * offline status being forced.
   *
   * @returns {string} Connection status.
   */
  get status() {
    return this.internal.offlineForced ? 'offline' : this.internal.status;
  }

  /**
   * Toggle forced offline mode on.
   */
  forceOffline() {
    this.internal.offlineForced = true;
    this.broadcast();
  }

  /**
   * Toggle forced offline mode off.
   */
  unforceOffline() {
    this.internal.offlineForced = false;
    this.broadcast();
  }

  /**
   * Returns detailed information about the current status.
   *
   * @returns {object} Detailed information about the status.
   */
  getStatusDetail() {
    return {
      status: this.status,
      navigatorStatus: this.internal.status,
      forcedOffline: this.internal.offlineForced,
    };
  }

  /**
   * Subscribe to connection status changes.
   *
   * @param {Function} callback Callback function to run when connection status changes.
   */
  subscribe(callback) {
    const detail = this.getStatusDetail();

    this.internal.changeCallbacks.push(callback);
    callback(detail);
  }

  /**
   * Broadcast the status to all subscribers and emits a global event
   * signalling the change.
   *
   * @param {object} detail Detail object to be broadcasted.
   */
  broadcast(detail = null) {
    if (!detail) detail = this.getStatusDetail();

    this.internal.changeCallbacks.forEach(
      (callback) => callback(detail),
    );

    window.dispatchEvent(
      new CustomEvent('connection-change', { detail }),
    );
  }

  /**
   * Broadcast the detail information with alert flag set to true in order
   * to indicate user action that couldn't be finished because the client is offline.
   */
  alert() {
    const detail = this.getStatusDetail();
    detail.alert = true;

    this.broadcast(detail);
  }
}
