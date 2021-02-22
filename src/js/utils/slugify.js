/**
 * Convert title to slug
 */
export default function slugify(title) {
  return title.toLowerCase().replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
}
