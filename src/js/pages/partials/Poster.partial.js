import VideoPlayer from '../../components/VideoPlayer';

export default (videoData, hideInfo = false) => {
  const posterWrapper = document.createElement('div');

  posterWrapper.className = 'poster-wrapper';
  posterWrapper.innerHTML = `<div class="poster-bg" style="background: linear-gradient(180deg, #223D55 0%, rgba(34, 61, 85, 0.729176) 10%, rgba(34, 61, 85, 0) 30%), linear-gradient(0deg, #223D55 0%, rgba(34, 61, 85, 0.729176) 10%, rgba(34, 61, 85, 0) 30%), url('${videoData.thumbnail}') center center">
    <button class="play"><img src="/play.svg" alt="" /></button>
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
