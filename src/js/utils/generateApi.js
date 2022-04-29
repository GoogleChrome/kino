/**
 * Copyright 2021 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Generates the single `api.json` file from `/src/api` resources.
 */

const fs = require('fs');
const path = require('path');
const frontMatter = require('front-matter');
const marked = require('marked');
const hljs = require('highlight.js');

const apiSrcPath = 'src/api/';
const apiDestFile = 'public/api.json';

marked.setOptions({
  highlight: (code, lang) => {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
});

/**
 * Iterator to recursively find all files in a given directory.
 *
 * @param {string} dir The directory to iterate over.
 * @yields {string} The next directory iterator or the absolute path to the file.
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
    const categoryName = path.basename(path.dirname(file)).replace(/^[0-9]+-/, '');
    const textData = fs.readFileSync(file, 'utf8');
    const fmContent = frontMatter(textData);

    if (fileName === 'index.md') {
      apiData.categories.push({
        ...fmContent.attributes,
        description: marked(fmContent.body),
      });
    } else {
      apiData.videos.push({
        id: fileName.replace('.md', '').replace(/^[0-9]+-/, ''),
        ...fmContent.attributes,
        categories: [categoryName],
        body: marked(fmContent.body),
      });
    }
  }

  return apiData;
};

/**
 * Generates the public JSON API.
 *
 * @returns {object} The plugin configuration.
 */
export default function generateApi() {
  return {
    name: 'generate-api',
    buildStart: async () => {
      const start = Date.now();
      const apiData = await generateApiData();
      const apiDataJSON = JSON.stringify(apiData, undefined, 2);

      fs.writeFile(apiDestFile, apiDataJSON, { encoding: 'utf-8' }, () => {
        const time = Date.now() - start;
        process.stdout.write(`\x1b[32mcreated \x1b[1m${apiDestFile}\x1b[22m in \x1b[1m${time}ms\x1b[22m\x1b[89m\n`);
      });
    },
  };
}
