/**
 * Convert title to slug
 *
 * @param {string} title Original title.
 * @returns {string} Slug.
 */
export default function slugify(title) {
  return title.toLowerCase().replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
}
