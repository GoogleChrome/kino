import slugify from '../utils/slugify';
import appendVideoToGallery from '../utils/appendVideoToGallery';
import getPoster from './partials/Poster.partial';
import { SW_CACHE_NAME } from '../constants';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    apiData,
    path,
    videoDownloaderRegistry,
  } = routerContext;
  const videoData = apiData.find((vd) => `/${slugify(vd.title)}` === path);
  const posterWrapper = getPoster(videoData, true);

  mainContent.innerHTML = `
  <article>
    <div class="container">
      <h2>${videoData.title}</h2>
      <div class="info">
        <span class="date">4th March, 2017</span>
        <span class="length">7mins 43secs</span>
      </div>
      <p>${videoData.description}</p>
      <span class="downloader"></span>
    </div>
  </article>
  <div class="category"></div>
`;
  mainContent.prepend(posterWrapper);

  let downloader = videoDownloaderRegistry.get(videoData.id);
  if (!downloader) {
    downloader = videoDownloaderRegistry.create(videoData.id);
    downloader.init(videoData, SW_CACHE_NAME);
  }
  downloader.setAttribute('expanded', 'true');

  mainContent.querySelector('.downloader').appendChild(downloader);
  const localContext = {
    content: mainContent.querySelector('.category'),
  };
  appendVideoToGallery(routerContext, localContext);
};
