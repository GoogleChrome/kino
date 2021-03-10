const fs = require('fs');

/**
 * Recursively browses and adds files to the cache.
 *
 * @param {string} folder Folder to browse.
 * @param {Array} assets The assets to cache.
 * @returns {Array} The updated assets.
 */
function browseAllFilesInDirectory(folder, assets) {
  const filesRegExp = /\.(html|css|js|svg|png|jpeg|jpg|ico)$/i;
  const excludeFiles = ['sw.js', '404.html'];
  let assetsToCache = [...assets];

  fs.readdirSync(folder).forEach((fileName) => {
    const resource = `${folder}/${fileName}`;
    if (fileName.match(filesRegExp) && !excludeFiles.includes(fileName)) {
      assetsToCache.push(`/${resource.replace(`${folder}/`, '')}`);
    } else if (fs.lstatSync(resource).isDirectory()) {
      assetsToCache = browseAllFilesInDirectory(resource, assetsToCache);
    }
  });

  return assetsToCache;
}

/**
 * Generates the cached assets for the service worker.
 *
 * @param {string} folder Folder to browse.
 * @param {Array} api The video files API.
 */
export default function generateAssetsToCache(folder, api) {
  const start = Date.now();

  // Add files from the public directory.
  const assetsToCache = browseAllFilesInDirectory(folder, ['/']);

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
