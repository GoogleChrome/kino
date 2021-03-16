const fs = require('fs');
const path = require('path');

/**
 * Iterator to recursively find the all the assets to cache.
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
 * Generates the cached assets for the service worker.
 *
 * @param {Array} api The video files API.
 */
export default async function generateAssetsToCache(api) {
  const start = Date.now();
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
  api.forEach((video) => {
    if (Array.isArray(video.thumbnail)) {
      video.thumbnail.forEach((thumbnail) => assetsToCache.push(thumbnail.src));
    } else if (Object.prototype.toString.call(video.thumbnail) === '[object String]') {
      assetsToCache.push(video.thumbnail);
    }
  });

  const data = `export default [\n  '${assetsToCache.join("',\n  '")}',\n];\n`;

  fs.writeFile('src/js/sw/cache.js', data, () => {
    const time = Date.now() - start;
    process.stdout.write(`created src/js/sw/cache.js in ${time}ms\n`);
  });
}
