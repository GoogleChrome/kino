/**
 * WIP
 */

const style = `
<style>
  :host {
    display: flex;
    align-items: center;
  }
  video {
    width: 100%;
    height: auto;
  }
</style>
`;
export default class extends HTMLElement {
  constructor() {
    super();

    // Attach Shadow DOM.
    this._root = this.attachShadow({ mode: 'open' });
  }

  render(videoData) {
    const sourcesHTML = videoData['video-sources'].reduce(
      (markup, sourceObject) => {
        markup += `<source src="${sourceObject.src}" type="${sourceObject.type}">`;
        return markup;
      },
      '',
    );
    const tracksHTML = (videoData['video-subtitles'] || []).reduce(
      (markup, trackObject) => {
        markup += `<track ${trackObject.default ? 'default ' : ''}src="${trackObject.src}" kind="${trackObject.kind}" srclang="${trackObject.srclang}" label="${trackObject.label}">`;
        return markup;
      },
      '',
    );

    const markup = `${style}
    <video ${videoData.thumbnail ? `poster="${videoData.thumbnail}"` : ''} controls crossorigin="anonymous">
      ${sourcesHTML}
      ${tracksHTML}
    </video>
    `;

    while (this._root.firstChild) {
      this._root.removeChild(this._root.firstChild);
    }
    this._root.innerHTML = markup;
  }
}
