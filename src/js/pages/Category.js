import findCategoryNameBySlug from '../utils/findCategoryNameBySlug';
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
  const categoryName = findCategoryNameBySlug(categorySlug, apiData);
  mainContent.innerHTML = `
    <div class="container">
      <header class="page-header">
        <h1>${categoryName}</h1>
      </header>
    </div>
  `;

  const filteredApiData = apiData.filter(
    (videoData) => videoData.categories.includes(categoryName),
  );

  const localContext = {
    category: categoryName,
    class: 'hide-header',
  };

  document.body.classList.add('is-category');

  appendVideoToGallery({
    ...routerContext,
    apiData: filteredApiData,
  }, localContext);
};
