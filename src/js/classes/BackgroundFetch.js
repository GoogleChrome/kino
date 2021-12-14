import getURLsForDownload from '../utils/getURLsForDownload';

const BG_FETCH_ID_TEMPLATE = /kino-(?<videoId>[a-z-_]+)/;

export default class BackgroundFetch {
  /**
   * Construct a new Background Fetch wrapper.
   */
  constructor() {
    this.id = '';
    this.videoId = '';
    this.onprogress = () => {};
    this.ondone = () => {};
  }

  async maybeAbort(swReg) {
    const existingBgFetch = await swReg.backgroundFetch.get(this.id);
    if (existingBgFetch) await existingBgFetch.abort();
  }

  /**
   *
   * @param {BackgroundFetchRegistration} registration Background Fetch Registration object.
   */
  fromRegistration(registration) {
    const matches = registration.id.match(BG_FETCH_ID_TEMPLATE);

    this.id = registration.id;
    this.videoId = matches.groups?.videoId || '';
  }

  async start(videoData) {
    this.videoId = videoData.id;
    this.id = `kino-${this.videoId}`;

    const urls = await getURLsForDownload(this.videoId);

    /** @type {Promise<Response[]>} */
    const requests = urls.map((url) => fetch(url, { method: 'HEAD' }));

    Promise.all(requests).then((responses) => {
      const sizes = responses.map((response) => response.headers.get('Content-Length'));
      const downloadTotal = sizes.includes(null)
        ? null
        : sizes.reduce((total, size) => total + parseInt(size, 10), 0);

      // eslint-disable-next-line compat/compat
      navigator.serviceWorker.ready.then(async (swReg) => {
        await this.maybeAbort(swReg);

        /** @type {BackgroundFetchRegistration} */
        const bgFetch = await swReg.backgroundFetch.fetch(
          this.id,
          urls,
          {
            title: `Downloading "${videoData.title}" video`,
            icons: videoData['media-session-artwork'] || {},
            downloadTotal,
          },
        );

        bgFetch.addEventListener('progress', () => {
          const progress = bgFetch.downloadTotal
            ? bgFetch.downloaded / bgFetch.downloadTotal
            : 0;

          this.onprogress(progress);
        });

        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (e) => {
          if (e.data === 'done') {
            this.ondone();
          }
        };

        const swController = navigator.serviceWorker.controller;

        /**
         * Need to guard the `postMessage` logic below, because
         * `navigator.serviceWorker.controller` will be `null`
         * when a force-refresh request is made.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/controller
         */
        if (swController) {
          navigator.serviceWorker.controller.postMessage({
            type: 'channel-port',
          }, [messageChannel.port2]);
        }
      });
    });
  }
}
