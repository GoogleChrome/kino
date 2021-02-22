const template = document.createElement('template');
template.innerHTML = `[CARD]`;

export default class DownloadCard extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}
