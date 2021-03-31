import appendVideoToGallery from '../utils/appendVideoToGallery';
import VideoPlayer from '../web-components/video-player/VideoPlayer';
import { SW_CACHE_NAME } from '../constants';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    apiData,
    path,
    connectionStatus,
    videoDownloaderRegistry,
  } = routerContext;

  /**
   * Pick the current video data out of the `apiData` array
   * and also return the rest of that data.
   */
  const [currentVideoData, restVideoData] = apiData.videos.reduce(
    (returnValue, videoMeta) => {
      if (path.includes(`/${videoMeta.id}`)) {
        returnValue[0] = videoMeta;
      } else {
        returnValue[1].push(videoMeta);
      }
      return returnValue;
    },
    [null, []],
  );

  const posterWrapper = document.createElement('div');
  const { thumbnail } = currentVideoData;

  let downloader = videoDownloaderRegistry.get(currentVideoData.id);
  if (!downloader) {
    downloader = videoDownloaderRegistry.create(currentVideoData.id);
    downloader.init(currentVideoData, SW_CACHE_NAME);
  }
  downloader.setAttribute('expanded', 'true');

  const disabled = (connectionStatus.status === 'offline' && downloader.state !== 'done');

  let videoImageHTML;

  if (Array.isArray(thumbnail)) {
    const sources = thumbnail.filter((t) => !t.default).map((t) => `<source srcset="${t.src}" type="${t.type}">`).join('');
    const defaultSource = thumbnail.find((t) => t.default);
    const defaultSourceHTML = `<img src="${defaultSource.src}" width="1280" height="720" alt="${currentVideoData.title}">`;

    videoImageHTML = `<picture>${sources}${defaultSourceHTML}</picture>`;
  } else {
    videoImageHTML = `<img src="${currentVideoData.thumbnail}" width="1280" height="720" alt="${currentVideoData.title}">`;
  }

  const [videoMinutes, videoSeconds] = currentVideoData.length.split(':');

  mainContent.innerHTML = `
  <div class="container">
    <article${disabled ? ' class="video--disabled"' : ''}>
      <div class="video-container width-full">
        <div class="video-container--image">
          ${videoImageHTML}
          <button class="play">
            <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_d)">
                <rect x="24" y="20.4863" width="64" height="64" rx="32" fill="white"/>
                <path d="M64 52.496C64 53.0015 63.8409 53.5089 63.5227 53.9152C63.4631 53.995 63.1847 54.3235 62.9659 54.5374L62.8466 54.654C61.1761 56.4251 57.0199 59.0885 54.9119 59.942C54.9119 59.9614 53.6591 60.4688 53.0625 60.4863H52.983C52.0682 60.4863 51.2131 59.9828 50.7756 59.1663C50.5369 58.7172 50.3182 57.4146 50.2983 57.3971C50.1193 56.2287 50 54.4402 50 52.4766C50 50.4178 50.1193 48.5495 50.3381 47.4025C50.3381 47.383 50.5568 46.3332 50.696 45.9833C50.9148 45.4798 51.3125 45.0501 51.8097 44.7779C52.2074 44.5855 52.625 44.4863 53.0625 44.4863C53.5199 44.5077 54.375 44.7974 54.7131 44.9335C56.9403 45.7889 61.196 48.5884 62.8267 50.2992C63.1051 50.5714 63.4034 50.9038 63.483 50.9796C63.821 51.4073 64 51.9323 64 52.496Z" fill="#141216"/>
              </g>
              <defs>
                <filter id="filter0_d" x="0" y="0.486328" width="112" height="112" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                  <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                  <feOffset dy="4"/>
                  <feGaussianBlur stdDeviation="12"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.24 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
                </filter>
              </defs>
            </svg>
          </button>
        </div>
        <div class="video-container--player"></div>
      </div>
      <h2>${currentVideoData.title}</h2>
      <div class="info">
        <span class="date">${currentVideoData.date}</span> • <span class="length">${videoMinutes}min ${videoSeconds}sec</span>
      </div>
      <p>${currentVideoData.description}</p>
      <p><span class="downloader"></span></p>
      ${currentVideoData.body}
    </article>
  </div>
`;
  mainContent.prepend(posterWrapper);
  mainContent.querySelector('.downloader').appendChild(downloader);

  const categorySlug = currentVideoData.categories[0];
  const { name, slug } = apiData.categories.find((obj) => obj.slug === categorySlug);
  const localContext = {
    category: `${name}:${slug}`,
  };
  const playButton = mainContent.querySelector('.play');

  playButton.addEventListener('click', (e) => {
    const videoContainer = e.target.closest('.video-container');
    const playerWrapper = videoContainer.querySelector('.video-container--player');
    const videoPlayer = new VideoPlayer();

    videoContainer.classList.add('has-player');
    videoPlayer.render(currentVideoData);
    playerWrapper.appendChild(videoPlayer);
    videoPlayer.play();
  });

  const sameCategoryVideos = restVideoData.filter(
    (obj) => obj.categories.includes(categorySlug),
  ).slice(0, 3);

  const galleryApiData = {
    videos: sameCategoryVideos,
    categories: apiData.categories,
  };

  /**
   * Passing `restVideoData` to avoid duplication of content on the single page.
   */
  appendVideoToGallery({
    ...routerContext,
    apiData: galleryApiData,
  }, localContext);
};
