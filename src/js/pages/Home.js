import appendVideoToGallery from '../utils/appendVideoToGallery';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const { mainContent, apiData } = routerContext;

  mainContent.innerHTML = `
    <div class="container">
      <header class="page-header">
        <h1>Bye bye buffering, hello video!</h1>
        <p>All our content is available on the web, which means you can get access to it whenever you want it. What's more, if your browser supports the latest technologies, you can save videos to view whenever you're offline!</p>
      </header>
    </div>
  `;

  const videosByCategories = apiData.videos.reduce((acc, videoData) => {
    videoData.categories.forEach((category) => {
      if (!(category in acc)) acc[category] = [];
      acc[category].push(videoData);
    });
    return acc;
  }, {});

  Object.keys(videosByCategories).forEach((category) => {
    const categoryData = apiData.categories.find((obj) => obj.slug === category);
    const localContext = {
      category: `${categoryData.name}:${categoryData.slug}`,
    };

    /**
     * Limit the number of videos to 3 per category on the homepage.
     */
    const categoryApiData = {
      categories: apiData.categories,
      videos: videosByCategories[category].slice(0, 3),
    };

    appendVideoToGallery({
      ...routerContext,
      apiData: categoryApiData,
    }, localContext);
  });
};
