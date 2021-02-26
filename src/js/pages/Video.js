import slugify from '../utils/slugify';
import appendVideoToGallery from '../utils/appendVideoToGallery';
import getPoster from './partials/Poster.partial';
import { SW_CACHE_NAME } from '../constants';

export default ({
  mainContent,
  videoDataArray,
  path,
  navigate,
}) => {
  const videoData = videoDataArray.find((vd) => `/${slugify(vd.title)}` === path);
  const posterWrapper = getPoster(videoData);

  mainContent.innerHTML = `
  <article>
    <div class="container">
      <h2>${videoData.title}</h2>
      <div class="info">
        <span class="date">4th March, 2017</span>
        <span class="length">7mins 43secs</span>
      </div>
      <p>${videoData.description}</p>
      <button class="primary icon-download">Make available offline</button>
      <button class="primary downloader">Make available offline</button>
    </div>
  </article>
  <div class="category"></div>
`;
  mainContent.prepend(posterWrapper);

  const downloader = document.createElement('video-downloader');
  downloader.init(videoData, SW_CACHE_NAME);
  mainContent.querySelector('article').appendChild();
  mainContent.querySelector('.downloader').prepend(downloader);

  const content = mainContent.querySelector('.category');
  appendVideoToGallery(videoDataArray, navigate, '', content);
};