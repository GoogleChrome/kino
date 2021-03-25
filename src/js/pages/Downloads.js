import { IDB_DATA_CHANGED_EVENT } from '../constants';
import getIDBConnection from '../classes/IDBConnection';
import getDownloaderElement from '../utils/getDownloaderElement';
import styles from '../web-components/video-grid/VideoGrid.css';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default async (routerContext) => {
  const {
    mainContent,
    apiData,
    navigate,
    connectionStatus,
    videoDownloaderRegistry,
  } = routerContext;
  mainContent.innerHTML = `
    <style>
      ${styles}
    </style>
    <div class="container">
      <header class="page-header">
        <h1>Manage downloads</h1>
        <p>This content is available offline.</p>
      </header>
    </div>
    <div class="container downloads">
      <div class="quota">
        <span class="quota--text">Storage used</span>
        <span class="quota--value"></span>
        <span class="quota--progress">
          <span class="quota--progress-value"></span>
        </span>
      </div>
      <div>
        <button class="primary delete-all" disabled>Delete all</button>
      </div>
    </div>
    <div class="container container--no-padding">
      <div class="video-cards">
        <ul></ul>
      </div>
    </div>
</div>
  `;

  const db = await getIDBConnection();
  const deleteAllBtn = mainContent.querySelector('.delete-all');
  const videoGallery = mainContent.querySelector('.video-cards ul');

  /**
   * Displays the current storage quota.
   */
  const displayQuota = () => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(
        (quota) => {
          const quotaElement = mainContent.querySelector('.quota--value');
          const progressValueElement = mainContent.querySelector('.quota--progress-value');

          if (quotaElement) {
            const bytesPerGB = 1000 * 1000 * 1000;
            const usedGB = (quota.usage / bytesPerGB).toFixed(2);
            const totalGB = (quota.quota / bytesPerGB).toFixed(2);

            quotaElement.innerHTML = `<span>${usedGB} GB</span> of ${totalGB} GB`;
            progressValueElement.style.width = `${(quota.usage / quota.quota) * 100}%`;
          }
        },
      );
    }
  };

  const renderPage = async () => {
    // Should partial downloads also be visible here? For now - yes.
    // .filter((meta) => meta.done)
    const allMeta = await db.meta.getAll();
    while (videoGallery.firstChild) {
      videoGallery.removeChild(videoGallery.firstChild);
    }

    allMeta.forEach((meta) => {
      const item = document.createElement('li');
      const videoData = apiData.find((vd) => vd.id === meta.videoId);
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

    if (allMeta.length === 0) {
      const tipDownload = document.createElement('div');
      const referenceNode = mainContent.querySelector('.downloads');

      tipDownload.className = 'container download-tip';
      tipDownload.innerHTML = `
        <p>
          No videos. To download a video press the
          <svg class="ready" viewBox="0 0 27 27" width="27" height="27" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7.304 25.416h11.56c4.026 0 6.552-2.852 6.552-6.888V7.638c0-4.036-2.512-6.888-6.552-6.888H7.304C3.265.75.752 3.602.752 7.638v10.89c0 4.036 2.514 6.888 6.554 6.888z" fill="" stroke="" stroke-width="1.5"/>
            <path d="M13.084 18.531V7.635M18.08 13.513l-4.996 5.018-4.998-5.018" fill="none" stroke="" stroke-width="1.5"/>
          </svg>
          button.
        </p>
       `;
      referenceNode.parentNode.insertBefore(tipDownload, referenceNode.nextSibling);
    } else {
      deleteAllBtn.removeAttribute('disabled');
    }

    /**
     * Display quota information and rerender it whenever IDB data changes.
     */
    displayQuota();
    window.addEventListener(IDB_DATA_CHANGED_EVENT, displayQuota);
  };

  /**
   * Removes all entries from the database on a click event.
   */
  deleteAllBtn.addEventListener('click', async () => {
    /**
     * @type {Iterator<string, VideoDownloader>}
     */
    const allDownloaders = Array.from(videoDownloaderRegistry.getAll());
    allDownloaders.forEach(
      ([, downloader]) => downloader.cancel(),
    );

    /**
     * Clears all data from IDB.
     */
    await db.clearAll();

    /**
     * Removes the cached `VideoDownload` objects.
     */
    videoDownloaderRegistry.destroyAll();

    deleteAllBtn.setAttribute('disabled', '');
    renderPage();
  });

  renderPage();
};
