import appendVideoToGallery from '../utils/appendVideoToGallery';

export default ({ mainContent, videoDataArray, navigate }) => {
  mainContent.innerHTML = `
    <div class="poster-bg">
      <button class="play" onclick="document.querySelector('.poster-bg').classList.add('has-player')"><img src="/play.svg" alt="" /></button>
      <div class="main-player">
        test
      </div>
    </div>
    `;
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
