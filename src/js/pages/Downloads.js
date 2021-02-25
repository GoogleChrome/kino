import getIDBConnection from '../modules/IDBConnection.module';
import { SW_CACHE_NAME } from '../constants';

export default async ({ mainContent, videoDataArray, navigate }) => {
  mainContent.innerHTML = `
    <style>
      .grid {
        margin-top: 2rem;
        /*display: grid;*/
        /*grid-template-columns: repeat(auto-fill, minmax(min(450px, 100%), 1fr));*/
        /*grid-gap: 2rem;*/
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
        grid-gap: 2rem;
      }
    </style>
    <div class="page-title">
        <h2>Manage your downloads</h2>
        <img src="/arrow-down.svg" alt="" />
    </div>
    <div class="downloads">
        <div class="header">
            <span>20 GB available <span>of 220 GB</span></span>
            <div>
                <button class="primary">Delete all</button>
            </div>
        </div>
        <div class="grid"></div>
    </div>
  `;
  const db = await getIDBConnection();
  const allMeta = await db.meta.getAll();

  const grid = mainContent.querySelector('.grid');

  // Should partial downloads also be visible here?
  // .filter((meta) => meta.done)
  allMeta.forEach((meta) => {
    const videoData = videoDataArray.find((vd) => vd['video-sources'].some((vs) => vs.src === meta.url));
    const card = document.createElement('video-card');
    const downloader = document.createElement('video-downloader');
    downloader.init(videoData, SW_CACHE_NAME);
    card.render(videoData, navigate);
    card.shadowRoot.querySelector('.downloader').appendChild(downloader);
    grid.appendChild(card);
  });
};
