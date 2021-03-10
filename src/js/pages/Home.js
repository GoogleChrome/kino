import appendVideoToGallery from '../utils/appendVideoToGallery';
import getPoster from './partials/Poster.partial';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const { mainContent, apiData } = routerContext;
  if (apiData[0]) {
    const mainVideoData = apiData[0] || {};
    mainContent.appendChild(getPoster(mainVideoData));
  }

  const videosByCategories = apiData.reduce((acc, videoData) => {
    videoData.categories.forEach((category) => {
      if (!(category in acc)) acc[category] = [];
      acc[category].push(videoData);
    });
    return acc;
  }, {});

  Object.keys(videosByCategories).forEach((category, index) => {
    const localContext = {
      category,
      index,
      limitN: true,
    };
    appendVideoToGallery({
      ...routerContext,
      apiData: videosByCategories[category].slice(0, 3), // We display max 3 items on the Home page.
    }, localContext);
  });
};
