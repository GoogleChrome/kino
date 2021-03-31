import styles from './VideoGrid.css';

const template = document.createElement('template');
template.innerHTML = `
  <style>${styles}</style>
  <section class="container container--no-padding">
    <header class="section-header">
        <h2 class="h3"></h2>
        <a data-use-router="" href="#">View all</a>
    </header>
    <div class="video-cards">
      <ul></ul>
    </div>
  </section>
`;

export default class VideoGrid extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.$category = this._root.querySelector('.section-header h2');
    this.$categoryLink = this._root.querySelector('.section-header a');
    this.render();
  }

  static get observedAttributes() {
    return ['category'];
  }

  get category() {
    return this.getAttribute('category');
  }

  set category(value) {
    this.setAttribute('category', value);
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (this.category) {
      const [name, slug] = this.category.split(':');
      this.$category.innerHTML = name;
      this.$categoryLink.href = `/category/${slug}/`;
    }
  }
}
