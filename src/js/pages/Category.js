import appendVideoToGallery from '../utils/appendVideoToGallery';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    apiData,
    path,
  } = routerContext;

  const categorySlug = path.replace('/category/', '').replace(/\/$/, '');
  const categoryObject = apiData.categories.find((candidate) => candidate.slug === categorySlug);

  mainContent.innerHTML = `
    <div class="container">
      <header class="page-header">
        <h1>${categoryObject.name}</h1>
        ${categoryObject.description}
      </header>
    </div>
  `;

  const videosFromCurrentCategory = apiData.videos.filter(
    (videoData) => videoData.categories.includes(categoryObject.slug),
  );
  const apiDataCurrentCategory = {
    videos: videosFromCurrentCategory,
    categories: apiData.categories,
  };

  const localContext = {
    category: `${categoryObject.name}:${categoryObject.slug}`,
    class: 'hide-header',
  };

  document.body.classList.add('is-category');

  appendVideoToGallery({
    ...routerContext,
    apiData: apiDataCurrentCategory,
  }, localContext);
};
