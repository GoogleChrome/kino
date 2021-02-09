const style = `
<style>
    :host {
        font-family: sans-serif;
        display: grid;
        grid-template:
            "image image" auto
            "title download" auto
            "description ." auto / 1fr auto;
    }
    *:not(img) {
        margin: 1rem;
    }
    img {
        grid-area: image;
        max-width: 100%;
        height: auto;
    }
    h2 {
        grid-area: title;
    }
    p {
        grid-area: description;
        margin-top: 0;
    }
    video-downloader {
        grid-area: download;
    }
</style>`;

export default class extends HTMLElement {
  constructor() {
    super();

    this._root = this.attachShadow({ mode: 'open' });
  }

  render(videoData) {
    const templateElement = document.createElement('template');
    templateElement.innerHTML = `${style}
            <img src="${videoData.thumbnail}" width="1280" height="720" alt="${videoData.title} - Thumbnail">
            <h2>${videoData.title}</h2>
            <p>${videoData.description}</p>`;

    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }

    const ui = templateElement.content.cloneNode(true);
    this._root.appendChild(ui);
  }
}
