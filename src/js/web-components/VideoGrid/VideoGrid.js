import slugify from '../../utils/slugify';
import styles from './VideoGrid.css';

const template = document.createElement('template');
template.innerHTML = `
  <style>${styles}</style>
  <section>
    <div class="container">
      <div class="section-header">
        <h2>...</h2>
        <a data-use-router href="/" class="view-all">View all</a>
      </div>
      <div class="grid"></div>
    </div>
  </section>
`;

export default class VideoGrid extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.$sectionHeader = this._root.querySelector('.section-header');
    this.$category = this._root.querySelector('.section-header h2');
    this.$categoryLink = this._root.querySelector('.section-header a');
    this.$background = this._root.querySelector('section');
    this.render();
  }

  static get observedAttributes() {
    return ['category', 'background'];
  }

  get category() {
    return this.getAttribute('category');
  }

  set background(value) {
    this.setAttribute('background', value);
  }

  get background() {
    return this.getAttribute('background');
  }

  set category(value) {
    this.setAttribute('category', value);
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (this.category) {
      this.$sectionHeader.style.display = 'flex';
      this.$category.innerHTML = this.category;
      this.$categoryLink.href = `/category/${slugify(this.category)}`;
    } else {
      this.$sectionHeader.style.display = 'none';
    }
    this.$background.style.backgroundColor = this.background;
  }
}
