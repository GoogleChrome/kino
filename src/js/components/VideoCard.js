import slugify from '../utils/slugify';
import { loadSetting } from '../utils/settings';

const style = `
<style>
    :host {
      overflow: hidden;
      border-radius: 7px;
      box-shadow: 0px 4px 5px rgba(0, 0, 0, 0.28);
      transition: all 120ms;
    }
    :host(:hover:not(.disabled)) {
        box-shadow: 0px 10px 13px rgba(0, 0, 0, 0.30);
        transform: scale(1.02);
    }
    :host(.disabled) {
      filter: grayscale(100%);
      opacity: 0.5;
    }
    .poster {
      background-size: cover;
      height: 0;
      padding-top: 56.25%;
      display: block;
    }
    .info {
      padding: 1rem;
      background: #FFF;
      height: 100%;
    }
    .info .title-icon {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .info .title-icon .downloader {
      margin-top: 2px;
      margin-left: 10px;
    }
    .info .title {
      font-size: 1.3rem;
      line-height: 1.5;
      font-weight: bold;
      color: #12283C;
      text-decoration: none;
    }
    .info .title:hover {
      text-decoration: underline;
    }
    .info .desc {
      font-size: 1rem;
      line-height: 1.5;
      color: #667F96;
    }
</style>`;

export default class extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });

    window.addEventListener('online', this.updateOnlineStatus.bind(this));
    window.addEventListener('online-mock', this.updateOnlineStatus.bind(this, { mock: true }));
    window.addEventListener('offline', this.updateOnlineStatus.bind(this));
    window.addEventListener('offline-mock', this.updateOnlineStatus.bind(this, { mock: false }));
  }

  updateOnlineStatus(opts = {}) {
    const isOnline = opts.mock !== undefined ? opts.mock : navigator.onLine;
    const offlineContentOnly = loadSetting('offline-content-only');
    const isDownloaded = opts.downloader && (opts.downloader.state === 'done');
    if (((!isOnline || offlineContentOnly) && !isDownloaded)) {
      this.classList.add('disabled');
    } else {
      this.classList.remove('disabled');
    }
  }

  attachDownloader(downloader) {
    downloader.onStatusUpdate = this.updateOnlineStatus.bind(this, { downloader });
    this._root.querySelector('.downloader').appendChild(downloader);
    this.updateOnlineStatus();
  }

  render(videoData, navigate) {
    this.navigate = navigate;
    const templateElement = document.createElement('template');
    let posterImage = videoData.thumbnail;

    if (Array.isArray(posterImage)) {
      posterImage = videoData.thumbnail.find((thumbnail) => thumbnail.default).src;
    }

    templateElement.innerHTML = `${style}
        <a href="/${slugify(videoData.title)}" class="poster" style="background-image: url('${posterImage}')"></a>
        <div class="info">
          <div class="title-icon">
            <a href="/${slugify(videoData.title)}" class="title">${videoData.title}</a>
            <div class="downloader"></div>
          </div>
          <div class="desc">${videoData.description}</div>
        </div>
      `;

    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this._root.appendChild(ui);
  }
}
