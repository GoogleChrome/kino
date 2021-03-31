/**
 * Generates the single `api.json` file from `/src/api` resources.
 */

const fs = require('fs');
const frontMatter = require('front-matter');
const marked = require('marked');

const apiSrcPath = 'src/api/';
const apiDestFile = 'public/api.json';

/**
 * Optional ordering of categories in the resulting API file.
 */
const categoriesOrder = ['html', 'streaming'];

/**
 * Retuns categories data.
 *
 * @returns {object[]} Array of categories data objects.
 */
const getCategoriesData = () => {
  const filenames = fs.readdirSync(apiSrcPath).filter((filename) => filename.endsWith('.json'));
  const orderedCategories = [];
  const categories = [];

  filenames.forEach(
    (filename) => {
      const textData = fs.readFileSync(`${apiSrcPath}${filename}`, { encoding: 'utf-8' });
      const jsonData = JSON.parse(textData);
      const index = categoriesOrder.indexOf(jsonData.slug);

      if (index > -1) {
        orderedCategories[index] = jsonData;
      } else {
        categories.push(jsonData);
      }
    },
  );

  return [...orderedCategories, ...categories];
};

/**
 * Returns video data entries.
 *
 * @param {object[]} categories Array of categories objects to retrieve video data for.
 *
 * @returns {object[]} Video data entries.
 */
const getVideosData = (categories) => {
  const videosData = [];

  categories.forEach(
    (category) => {
      const contentPath = `${apiSrcPath}${category.slug}/`;
      const filenames = fs.readdirSync(contentPath).filter((filename) => filename.endsWith('.md'));

      filenames.forEach(
        (filename) => {
          const textData = fs.readFileSync(`${contentPath}${filename}`, { encoding: 'utf-8' });
          const fmContent = frontMatter(textData);
          const apiEntry = {
            id: filename.replace('.md', ''),
            ...fmContent.attributes,
            categories: [category.name],
            body: marked(fmContent.body),
          };
          videosData.push(apiEntry);
        },
      );
    },
  );
  return videosData;
};

/**
 * Generates the JSON API.
 *
 * @returns {object} The API object.
 */
export default async function generateApi() {
  const start = Date.now();
  const categories = getCategoriesData();
  const apiData = {
    videos: getVideosData(categories),
    categories,
  };
  const apiDataJSON = JSON.stringify(apiData, undefined, 2);

  fs.writeFile(apiDestFile, apiDataJSON, { encoding: 'utf-8' }, () => {
    const time = Date.now() - start;
    process.stdout.write(`\x1b[32mcreated \x1b[1m${apiDestFile}\x1b[22m in ${time}ms\x1b[89m\n`);
  });

  return apiData;
}
