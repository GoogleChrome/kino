import styles from './VideoCard.css';

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

    templateElement.innerHTML = `<style>${styles}</style>
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
