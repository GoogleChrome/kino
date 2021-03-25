import slugify from './slugify';

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

export default findCategoryNameBySlug;
