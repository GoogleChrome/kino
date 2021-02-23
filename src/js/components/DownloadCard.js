const template = document.createElement('template');
template.innerHTML = `
  <style>
  :host {
    display: flex;
  }
  .poster {
    border-radius: 7px;
    background: #000;
    width: 200px;
    height: 138px;
    flex: 0 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header span {
    font-size: 1.3rem;
    line-height: 1.5;
    font-weight: bold;
    color: #FFF;
  }
  .header .icon {
    margin-left: 10px;
  }
  .info {
    margin-left: 1rem;
  }
  .info p {
    font-size: 1rem;
    line-height: 1.5;
    color: #97ADC0;
  }
  </style>
  <div class="poster"></div>
  <div class="info">
    <div class="header">
      <span>Video Title Video Title Video Title</span>
      <img class="icon" src="/download-circle-dark.svg"  alt=""/>
    </div>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Adipiscing habitasse pellentesque.</p>
  </div>
`;

export default class DownloadCard extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
}
