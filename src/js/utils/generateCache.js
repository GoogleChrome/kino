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

const fs = require('fs');
const path = require('path');

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
 * Generates the cached assets for the service worker.
 *
 * @returns {object} The plugin configuration.
 */
export default function generateCache() {
  return {
    name: 'generate-cache',
    buildStart: async () => {
      const start = Date.now();
      const api = JSON.parse(fs.readFileSync(`${process.cwd()}/public/api.json`, 'utf8'));
      const filesRegExp = /\.(html|css|js|svg|png|jpeg|jpg|ico)$/i;
      const excludeFiles = ['sw.js', '404.html'];
      const assetsToCache = ['/', '/api.json'];
      const folder = 'public';

      // eslint-disable-next-line
      for await (const file of getFiles(folder)) {
        const fileName = path.basename(file);
        const filePath = file.replace(`${process.cwd()}/${folder}`, '');
        if (fileName.match(filesRegExp) && !excludeFiles.includes(fileName)) {
          assetsToCache.push(filePath);
        }
      }

      // Add files from the API.
      api.videos.forEach((video) => {
        if (Array.isArray(video.thumbnail)) {
          video.thumbnail.forEach((thumbnail) => assetsToCache.push(thumbnail.src));
        } else if (Object.prototype.toString.call(video.thumbnail) === '[object String]') {
          assetsToCache.push(video.thumbnail);
        }
      });

      const data = `/*
Copyright 2021 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

export default [\n  '${assetsToCache.join("',\n  '")}',\n];\n`;

      fs.writeFile('src/js/sw/cache.js', data, () => {
        const time = Date.now() - start;
        process.stdout.write(`\x1b[32mcreated \x1b[1msrc/js/sw/cache.js\x1b[22m in \x1b[1m${time}ms\x1b[22m\x1b[89m\n`);
      });
    },
  };
}
