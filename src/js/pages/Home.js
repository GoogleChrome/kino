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
};
