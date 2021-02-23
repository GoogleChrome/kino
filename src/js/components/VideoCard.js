import slugify from '../utils/slugify';

const style = `
<style>
    :host {
      overflow: hidden;
      border-radius: 7px;
      box-shadow: 0px 4px 5px rgba(0, 0, 0, 0.28);
      transition: all 120ms;
    }
    :host(:hover) {
        box-shadow: 0px 10px 13px rgba(0, 0, 0, 0.30);
        transform: scale(1.02);
        /*filter: grayscale(100%);*/
        /*opacity: 0.5;*/
    }
    .poster {
      background-image: url("https://storage.googleapis.com/biograf-video-files/videos/ttt-ep-2/poster.jpg");
      background-size: cover;
      height: 0;
      padding-top: 56.25%;
      display: block;
    }
    .info {
      padding: 1rem;
      background: #FFF;
      height: 100%;
    }
    .info .title-icon {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .info .title-icon .icon {
      margin-top: 2px;
      margin-left: 10px;
    }
    .info .title {
      font-size: 1.3rem;
      line-height: 1.5;
      font-weight: bold;
      color: #12283C;
      text-decoration: none;
    }
    .info .title:hover {
        text-decoration: underline;
    }
    .info .desc {
      font-size: 1rem;
      line-height: 1.5;
      color: #667F96;
    }
</style>`;

export default class extends HTMLElement {
  constructor() {
    super();

    this._root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    const navigate = this.navigate;
    const links = this._root.querySelectorAll('a');
    links.forEach((link) => link.addEventListener('click', function(e) {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      navigate(this.href);
    }));
  }

  render(videoData, navigate) {
    this.navigate = navigate;
    const templateElement = document.createElement('template');
    templateElement.innerHTML = `${style}
        <a href="/${slugify(videoData.title)}" class="poster" style="background-image: url('${videoData.thumbnail}')"></a>
        <div class="info">
          <div class="title-icon">
            <a href="/${slugify(videoData.title)}" class="title">${videoData.title}</a>
            <img class="icon" src="download-circle.svg"  alt=""/>
          </div>
          <div class="desc">${videoData.description}</div>
        </div>
      `;

    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this._root.appendChild(ui);
  }
}
