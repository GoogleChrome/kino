import appendVideoToGallery from '../utils/appendVideoToGallery';
import getPoster from './partials/Poster.partial';

export default ({ mainContent, videoDataArray, navigate }) => {
  if (videoDataArray[0]) {
    const mainVideoData = videoDataArray[0] || {};
    mainContent.appendChild(getPoster(mainVideoData));
  }

  const videosByCategories = videoDataArray.reduce((acc, videoData) => {
    videoData.categories.forEach((category) => {
      if (!(category in acc)) acc[category] = [];
      acc[category].push(videoData);
    });
    return acc;
  }, {});
  Object.keys(videosByCategories).forEach((category, index) => {
    appendVideoToGallery(videosByCategories[category], navigate, category, mainContent, index);
  });

  // Mobile view header switch
  const info = document.querySelector('.poster-wrapper .info');
  const posterWrapper = document.querySelector('.poster-wrapper');
  const posterBg = document.querySelector('.poster-bg');
  window.matchMedia('(max-width: 700px)').addListener((e) => {
    if (e.matches) {
      posterWrapper.appendChild(info);
    } else {
      posterBg.appendChild(info);
    }
  });
};
