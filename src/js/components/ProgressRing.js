export default class ProgressRing extends HTMLElement {
  constructor() {
    super();
    const stroke = this.getAttribute('stroke');
    const radius = this.getAttribute('radius');
    const normalizedRadius = radius - stroke;
    this._circumference = normalizedRadius * 2 * Math.PI;

    this._root = this.attachShadow({mode: 'open'});
    this._root.innerHTML = `
      <svg
        height="${radius * 2}"
        width="${radius * 2}"
       >
        <circle
           stroke="#EFEFEF"
           stroke-width="${stroke}"
           fill="transparent"
           r="${normalizedRadius}"
           cx="${radius}"
           cy="${radius}"
        />
         <circle
           stroke="#56C0AD"
           stroke-linecap="round"
           stroke-dasharray="${this._circumference} ${this._circumference}"
           style="stroke-dashoffset:${this._circumference}"
           stroke-width="${stroke}"
           fill="transparent"
           r="${normalizedRadius}"
           cx="${radius}"
           cy="${radius}"
        />
      </svg>

      <style>
        circle {
          transition: stroke-dashoffset 0.35s;
          transform: rotate(-90deg);
          transform-origin: 50% 50%;
        }
      </style>
    `;
  }

  setProgress(progress) {
    const offset = this._circumference - (progress * this._circumference);
    const circle = this._root.querySelector('circle:last-of-type');
    circle.style.strokeDashoffset = offset;
  }

  static get observedAttributes() {
    return ['progress'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'progress') {
      const clampedProgress = Math.min(Math.max(0, newValue), 100);
      this.setProgress(clampedProgress);
    }
  }
}
