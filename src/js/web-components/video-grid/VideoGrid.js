/**
 * Copyright 2021 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
