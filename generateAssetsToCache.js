const fs = require('fs');
const apiJSON = require('./public/api/video-list.json');

const rootFolder = 'public';
const assetsToCache = ['/'];

function browseAllFilesInDirectory(folder) {
  const filesRegExp = /\.(html|css|js|svg|png|jpeg")$/i;
  const excludeFiles = ['sw.js', '404.html'];

  fs.readdirSync(folder).forEach((fileName) => {
    const resource = `${folder}/${fileName}`;
    if (fileName.match(filesRegExp) && !excludeFiles.includes(fileName)) {
      assetsToCache.push(`/${resource.replace(`${rootFolder}/`, '')}`);
    } else if (fs.lstatSync(resource).isDirectory()) {
      browseAllFilesInDirectory(resource);
    }
  });
}

browseAllFilesInDirectory(rootFolder);
apiJSON.forEach((video) => assetsToCache.push(video.thumbnail));

fs.writeFile('assetsToCache.js', `export default [\n  '${assetsToCache.join("',\n  '")}',\n];\n`, () => {
  process.stdout.write('Generated assetsToCache.js');
});
