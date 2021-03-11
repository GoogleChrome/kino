import appendVideoToGallery from '../utils/appendVideoToGallery';
import getPoster from './partials/Poster.partial';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const { mainContent, apiData, viewport } = routerContext;
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

  // eslint-disable-next-line no-nested-ternary
  const itemsN = viewport === 'mobile' ? 1 : (viewport === 'tablet' ? 2 : 3);

  Object.keys(videosByCategories).forEach((category, index) => {
    const localContext = {
      category,
      index,
    };
    appendVideoToGallery({
      ...routerContext,
      apiData: videosByCategories[category].slice(0, itemsN),
    }, localContext);
  });
};
