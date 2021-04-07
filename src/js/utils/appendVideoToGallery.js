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

  const videoGrid = document.createElement('video-grid');
  videoGrid.category = localContext.category || '';
  videoGrid.setAttribute('class', localContext.class || 'flex');

  const videoCards = videoGrid.shadowRoot.querySelector('.video-cards');
  const videoGallery = videoGrid.shadowRoot.querySelector('.video-cards ul');

  videoCards.classList.add(localContext.columns === 2 ? 'col-2' : 'col-3');

  apiData.videos.forEach((videoData) => {
    const item = document.createElement('li');
    const card = document.createElement('video-card');
    const downloader = getDownloaderElement(videoDownloaderRegistry, videoData);

    card.render({
      videoData,
      navigate,
      connectionStatus,
      downloader,
    });

    item.appendChild(card);
    videoGallery.appendChild(item);
  });

  mainContent.appendChild(videoGrid);
}

export default appendVideoToGallery;
