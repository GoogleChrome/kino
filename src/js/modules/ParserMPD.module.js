/**
 * WIP + larger in scope.
 *
 * Parse a MPD (Dash manifest) file and extract information about the media sources
 * necessary for playback and storage.
 */
export default class {
  constructor(manifest) {
    const domParser = new DOMParser();
    this.manifest = domParser.parseFromString(manifest, 'text/xml');

    /* eslint-disable no-console */
    console.log(this.manifest);
    /* eslint-enable no-console */
  }
}
