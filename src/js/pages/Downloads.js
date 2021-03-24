import { IDB_DATA_CHANGED_EVENT } from '../constants';
import getIDBConnection from '../classes/IDBConnection';
import getDownloaderElement from '../utils/getDownloaderElement';

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
      .grid {
        margin-top: 2rem;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
        grid-gap: 2rem;
        max-width: 1200px;
      }
      .clearing {
        opacity: 0.3;
      }
    </style>
    <div class="page-title">
        <h2>Manage your downloads</h2>
        <img src="/images/arrow-down.svg" alt="" />
    </div>
    <div class="downloads container">
        <div class="header">
            <span class="quota"></span>
            <div>
                <button class="primary delete-all" disabled>Delete all</button>
            </div>
        </div>
        <div class="grid"></div>
    </div>
  `;

  const db = await getIDBConnection();
  const deleteAllBtn = mainContent.querySelector('.delete-all');
  const grid = mainContent.querySelector('.grid');

  /**
   * Displays the current storage quota.
   */
  const displayQuota = () => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(
        (quota) => {
          const quotaElement = mainContent.querySelector('.quota');

          if (quotaElement) {
            const bytesPerGB = 1000 * 1000 * 1000;
            const availableGB = ((quota.quota - quota.usage) / bytesPerGB).toFixed(2);
            const totalGB = (quota.quota / bytesPerGB).toFixed(2);

            quotaElement.innerHTML = `${availableGB} GB available <span>of ${totalGB} GB</span>`;
          }
        },
      );
    }
  };

  const renderPage = async () => {
    // Should partial downloads also be visible here? For now - yes.
    // .filter((meta) => meta.done)
    const allMeta = await db.meta.getAll();
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    allMeta.forEach((meta) => {
      const videoData = apiData.find((vd) => vd.id === meta.videoId);
      const card = document.createElement('video-card');
      const downloader = getDownloaderElement(videoDownloaderRegistry, videoData);

      card.render({
        videoData,
        navigate,
        connectionStatus,
        downloader,
      });

      grid.appendChild(card);
    });

    if (allMeta.length === 0) {
      const tipDownload = document.createElement('div');
      tipDownload.className = 'center-text tip';
      tipDownload.innerHTML = 'No videos. To download a video press the <img class="vertical-bottom" src="/images/download-circle.svg" /> button.';
      mainContent.querySelector('.downloads').appendChild(tipDownload);
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
   *
   * @param {Event} e Click event.
   */
  deleteAllBtn.addEventListener('click', async (e) => {
    const btn = e.target;

    /**
     * @type {Iterator<string, VideoDownloader>}
     */
    const allDownloaders = Array.from(videoDownloaderRegistry.getAll());
    allDownloaders.forEach(
      ([, downloader]) => downloader.cancel(),
    );

    grid.classList.add('clearing');
    btn.classList.add('clearing');

    /**
     * Clears all data from IDB.
     */
    await db.clearAll();

    /**
     * Removes the cached `VideoDownload` objects.
     */
    videoDownloaderRegistry.destroyAll();

    btn.classList.remove('clearing');
    deleteAllBtn.setAttribute('disabled', '');
    renderPage();
  });

  renderPage();
};
