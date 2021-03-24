import getDownloaderElement from './getDownloaderElement';

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
    connectionStatus,
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
    const downloader = getDownloaderElement(videoDownloaderRegistry, videoData);

    card.render({
      videoData,
      navigate,
      connectionStatus,
      downloader,
    });

    videoGallery.appendChild(card);
  });

  mainContent.appendChild(videoGrid);
}

export default appendVideoToGallery;
