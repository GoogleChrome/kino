import getIDBConnection from '../modules/IDBConnection.module';
import getDownloaderElement from '../utils/getDownloaderElement.module';

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
      }
      .clearing {
        opacity: 0.3;
      }
    </style>
    <div class="page-title">
        <h2>Manage your downloads</h2>
        <img src="/images/arrow-down.svg" alt="" />
    </div>
    <div class="downloads">
        <div class="header container">
            <span>20 GB available <span>of 220 GB</span></span>
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
