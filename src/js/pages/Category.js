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

  const categorySlug = path.replace('/category/', '');
  const categoryName = findCategoryNameBySlug(categorySlug, apiData);
  mainContent.innerHTML = `
    <div class="page-title">
        <h2>${categoryName}</h2>
        <img src="/images/arrow-down.svg" alt="" />
    </div>
    <div class="category"></div>
  `;

  const filteredApiData = apiData.filter(
    (videoData) => videoData.categories.includes(categoryName),
  );
  const localContext = {
    content: mainContent.querySelector('.category'),
  };

  appendVideoToGallery({
    ...routerContext,
    apiData: filteredApiData,
  }, localContext);
};
