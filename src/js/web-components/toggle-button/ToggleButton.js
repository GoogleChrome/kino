import { loadSetting, saveSetting, removeSetting } from '../../utils/settings';
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
      this.setNewToggleState(e.target.checked);
    });

    this.render();
  }

  static get observedAttributes() {
    return ['checked', 'setting'];
  }

  get checked() {
    return this.getAttribute('checked') === 'true';
  }

  set checked(value) {
    this.setAttribute('checked', value);
    this.$checkbox.checked = value;
  }

  get setting() {
    return this.getAttribute('setting');
  }

  set setting(value) {
    this.setAttribute('setting', value);
  }

  setNewToggleState(isChecked) {
    this.checked = isChecked;
    if (isChecked) {
      saveSetting(this.setting, isChecked);
    } else {
      removeSetting(this.setting);
    }

    this.dispatchEvent(
      new CustomEvent('setting-change', {
        bubbles: true,
        cancelable: true,
        detail: { setting: this.setting, value: this.checked },
      }),
    );
  }

  attributeChangedCallback(name) {
    if (name === 'setting') this.render();
  }

  /**
   * Renders the toggle button.
   */
  render() {
    this.checked = (loadSetting(this.setting) === true);
  }
}
