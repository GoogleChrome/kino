import styles from './ToggleButton.css';

const template = document.createElement('template');
template.innerHTML = `<style>${styles}</style>
  <div class="toggle">
    <input id="toggle" type="checkbox">
    <label for="toggle"></label>
  </div>`;

export default class ToggleButton extends HTMLElement {
  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.$checkbox = this._root.querySelector('input');
    this.$checkbox.addEventListener('change', (e) => {
      this.checked = e.target.checked;
      this.dispatchEvent(
        new CustomEvent('change', { detail: { value: e.target.checked } }),
      );
    });
  }

  static get observedAttributes() {
    return ['checked'];
  }

  get checked() {
    return this.getAttribute('checked') === 'true';
  }

  set checked(value) {
    this.setAttribute('checked', value);
    this.$checkbox.checked = value;
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    this.$checkbox.checked = this.checked;
  }
}
