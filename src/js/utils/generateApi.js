/**
 * Generates the single `api.json` file from `/src/api` resources.
 */

const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');
const marked = require('marked');

const apiSrcPath = 'src/api/';
const apiDestFile = 'public/api.json';

/**
 * Iterator to recursively find all files in a given directory.
 *
 * @param {string} dir The directory to iterate over.
 * @returns {any} The next directory iterator or the absolute path to the file.
 */
async function* getFiles(dir) {
  const items = await fs.promises.readdir(dir, { withFileTypes: true });

  // eslint-disable-next-line
  for (const item of items) {
    const resPath = path.resolve(dir, item.name);
    if (item.isDirectory()) {
      yield* getFiles(resPath);
    } else {
      yield resPath;
    }
  }
}

/**
 * Returns categories data.
 *
 * @returns {object[]} Array of categories data objects.
 */
const generateApiData = async () => {
  const apiData = {
    categories: [],
    videos: [],
  };

  // eslint-disable-next-line
  for await (const file of getFiles(apiSrcPath)) {
    const fileName = path.basename(file);
    const categoryName = path.basename(path.dirname(file));
    const textData = fs.readFileSync(file, 'utf8');
    const fmContent = frontMatter(textData);

    if (fileName === 'index.md') {
      apiData.categories.push({
        ...fmContent.attributes,
        description: marked(fmContent.body),
      });
    } else {
      apiData.videos.push({
        id: fileName.replace('.md', ''),
        ...fmContent.attributes,
        categories: [categoryName],
        body: marked(fmContent.body),
      });
    }
  }

  return apiData;
};

/**
 * Generates the JSON API.
 *
 * @returns {object} The API object.
 */
export default async function generateApi() {
  const start = Date.now();
  const apiData = await generateApiData();
  const apiDataJSON = JSON.stringify(apiData, undefined, 2);

  fs.writeFile(apiDestFile, apiDataJSON, { encoding: 'utf-8' }, () => {
    const time = Date.now() - start;
    process.stdout.write(`\x1b[32mcreated \x1b[1m${apiDestFile}\x1b[22m in \x1b[1m${time}ms\x1b[22m\x1b[89m\n`);
  });

  return apiData;
}
