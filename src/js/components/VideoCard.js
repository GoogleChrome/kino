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

/**
 * When the connection status changes, enable or disable the card
 * with respect to the download state.
 *
 * @param {ConnectionStatus} connectionStatus ConnectionStatus instance.
 * @param {VideoDownloader}  downloader       `VideoDownloader` instance.
 */
function connectionStatusChangeHandler(connectionStatus, downloader) {
  if (connectionStatus.status === 'offline' && downloader.state !== 'done') {
    this.classList.add('disabled');
  } else {
    this.classList.remove('disabled');
  }
}

export default class VideoCard extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  render({
    videoData,
    connectionStatus,
    downloader,
  }) {
    const templateElement = document.createElement('template');
    let posterImage = videoData.thumbnail;

    if (Array.isArray(posterImage)) {
      posterImage = videoData.thumbnail.find((thumbnail) => thumbnail.default).src;
    }

    templateElement.innerHTML = `${style}
        <a data-use-router href="/${videoData.id}" class="poster" style="background-image: url('${posterImage}')"></a>
        <div class="info">
          <div class="title-icon">
            <a data-use-router href="/${videoData.id}" class="title">${videoData.title}</a>
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
    this._root.querySelector('.downloader').appendChild(downloader);

    const boundHandler = connectionStatusChangeHandler.bind(this, connectionStatus, downloader);

    /**
     * Whenever connection status or downloader state changes,
     * maybe disable / enable the card.
     */
    connectionStatus.subscribe(boundHandler);
    downloader.subscribe(boundHandler);
  }
}
