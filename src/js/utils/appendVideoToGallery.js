import { SW_CACHE_NAME } from '../constants';

/**
 * @param {RouterContext} routerContext Context passed through by Router.
 * @param {object}        localContext  Additional data needed by this method.
 */
function appendVideoToGallery(routerContext, localContext) {
  const {
    videoDownloaderRegistry,
    apiData,
    navigate,
    mainContent,
  } = routerContext;

  const category = localContext.category || '';
  const index = localContext.index || 0;

  const videoGrid = document.createElement('video-grid');
  videoGrid.category = category || '';
  videoGrid.background = getComputedStyle(document.documentElement)
    .getPropertyValue(`--background-${index % 2 === 0 ? 'light' : 'dark'}`);
  const videoGallery = videoGrid.shadowRoot.querySelector('.grid');

  apiData.forEach((videoData) => {
    const card = document.createElement('video-card');

    let downloader = videoDownloaderRegistry.get(videoData.id);
    if (!downloader) {
      downloader = videoDownloaderRegistry.create(videoData.id);
      downloader.init(videoData, SW_CACHE_NAME);
    }
    downloader.setAttribute('expanded', 'false');

    const player = document.createElement('video-player');
    card.render(videoData, navigate);
    card.attachDownloader(downloader);
    player.render(videoData);
    videoGallery.appendChild(card);
  });

  mainContent.appendChild(videoGrid);
}

export default appendVideoToGallery;
