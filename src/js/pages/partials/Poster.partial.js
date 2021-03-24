import VideoPlayer from '../../web-components/video-player/VideoPlayer';

export default (videoData, hideInfo = false) => {
  const posterWrapper = document.createElement('div');
  const { thumbnail } = videoData;
  let videoImageHTML;

  if (Array.isArray(thumbnail)) {
    const sources = thumbnail.filter((t) => !t.default).map((t) => `<source srcset="${t.src}" type="${t.type}">`).join('');
    const defaultSource = thumbnail.find((t) => t.default);
    const defaultSourceHTML = `<img src="${defaultSource.src}" width="1280" height="720" alt="${videoData.title}">`;

    videoImageHTML = `<picture>${sources}${defaultSourceHTML}</picture>`;
  } else {
    videoImageHTML = `<img src="${videoData.thumbnail}" width="1280" height="720" alt="${videoData.title}">`;
  }

  posterWrapper.className = 'poster-wrapper';
  posterWrapper.innerHTML = `<div class="poster-bg">
    <div class="poster-image">
        ${videoImageHTML}
        <button class="play"><img src="/images/play.svg" alt="" /></button>
    </div>
    <div class="main-player"></div>
  </div>
  ${hideInfo ? '' : `
    <div class="info">
      <div class="container">
        <h1>${videoData.title}</h1>
        <p>${videoData.description}</p>
      </div>
    </div>`}
`;

  const playButton = posterWrapper.querySelector('.play');

  playButton.addEventListener('click', (e) => {
    const poster = e.target.closest('.poster-bg');
    const playerWrapper = poster.querySelector('.main-player');
    const videoPlayer = new VideoPlayer();

    poster.classList.add('has-player');
    videoPlayer.render(videoData);
    playerWrapper.appendChild(videoPlayer);
    videoPlayer.play();
  });

  return posterWrapper;
};
