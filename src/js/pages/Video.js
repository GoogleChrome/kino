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

  /**
   * Pick the current video data out of the `apiData` array
   * and also return the rest of that data.
   */
  const [currentVideoData, restVideoData] = apiData.reduce(
    (returnValue, videoMeta) => {
      if (`/${videoMeta.id}` === path) {
        returnValue[0] = videoMeta;
      } else {
        returnValue[1].push(videoMeta);
      }
      return returnValue;
    },
    [null, []],
  );

  const posterWrapper = getPoster(currentVideoData, true);

  mainContent.innerHTML = `
  <article>
    <div class="container">
      <h2>${currentVideoData.title}</h2>
      <div class="info">
        <span class="date">4th March, 2017</span>
        <span class="length">7mins 43secs</span>
      </div>
      <p>${currentVideoData.description}</p>
      <span class="downloader"></span>
    </div>
  </article>
  <div class="category"></div>
`;
  mainContent.prepend(posterWrapper);

  let downloader = videoDownloaderRegistry.get(currentVideoData.id);
  if (!downloader) {
    downloader = videoDownloaderRegistry.create(currentVideoData.id);
    downloader.init(currentVideoData, SW_CACHE_NAME);
  }
  downloader.setAttribute('expanded', 'true');

  mainContent.querySelector('.downloader').appendChild(downloader);
  const localContext = {
    content: mainContent.querySelector('.category'),
  };

  /**
   * Passing `restVideoData` to avoid duplication of content on the single page.
   */
  appendVideoToGallery({
    ...routerContext,
    apiData: restVideoData,
  }, localContext);
};
