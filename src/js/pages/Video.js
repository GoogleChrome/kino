import slugify from '../utils/slugify';
import appendVideoToGallery from '../utils/appendVideoToGallery';

export default ({ mainContent, videoDataArray, path, navigate }) => {
  const videoData = videoDataArray.find((vd) => `/${slugify(vd.title)}` === path);
  mainContent.innerHTML = `
    <div class="poster-bg" style="background: linear-gradient(180deg, #223D55 0%, rgba(34, 61, 85, 0.729176) 10%, rgba(34, 61, 85, 0) 30%), linear-gradient(0deg, #223D55 0%, rgba(34, 61, 85, 0.729176) 10%, rgba(34, 61, 85, 0) 30%), url('${videoData.thumbnail}')">
      <button class="play" onclick="document.querySelector('.poster-bg').classList.add('has-player')"><img src="/play.svg" alt="" /></button>
      <div class="main-player">
        test
      </div>
    </div>
  <article>
    <div class="container">
      <h2>${videoData.title}</h2>
      <div class="info">
        <span class="date">4th March, 2017</span>
        <span class="length">7mins 43secs</span>
      </div>
      <p>${videoData.description}</p>
      <button class="primary icon-download">Make available offline</button>
    </div>
  </article>
  <div class="category"></div>
`;
  const content = mainContent.querySelector('.category');
  appendVideoToGallery(videoDataArray, navigate, '', content);
}
