import slugify from '../utils/slugify';
import appendVideoToGallery from '../utils/appendVideoToGallery';

/**
 * Finds category name by slug (reverse lookup).
 *
 * @todo Later on if we introduce Categories endpoint that will be changed.
 *
 * @param {string} slug Slug.
 * @param {object[]} apiData Array of video metadata objects.
 *
 * @returns {string} Category name or empty string.
 */
function findCategoryNameBySlug(slug, apiData) {
  for (let i = 0; i < apiData.length; i += 1) {
    for (let j = 0; j < apiData[i].categories.length; j += 1) {
      const cat = apiData[i].categories[j];
      if (slugify(cat) === slug) {
        return cat;
      }
    }
  }
  return '';
}

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
