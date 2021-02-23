import Streamer from '../modules/Streamer.module';
import ParserMPD from '../modules/ParserMPD.module';
import ParserM3U8 from '../modules/ParserM3U8.module';

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

const STREAMING_MIME_TYPES = [
  'application/dash+xml',
  'application/vnd.apple.mpegurl', // <-- HLS (m3u8)
];
export default class extends HTMLElement {
  constructor() {
    super();

    this.internal = {};
    this.internal.root = this.attachShadow({ mode: 'open' });
  }

  /**
   * @returns {boolean} Whether the client supports MSE.
   */
  clientSupportsMSE() {
    return 'MediaSource' in window;
  }

  /**
   * Returns an array of source objects appropriate to capabilities
   * of the current client.
   *
   * In case the client supports video streaming (DASH / HLS) and sources
   * include streaming sources (MPD, M3U8 manifests), return only the
   * streaming sources.
   *
   * In all other cases return all video sources as returned from the API.
   *
   * @returns {Array} Appropriate sources.
   */
  getAppropriateSources() {
    const clientSupportsMSE = this.clientSupportsMSE();
    const sources = this._videoData['video-sources'] || [];
    const streamingSources = sources.filter(
      (sourceObject) => STREAMING_MIME_TYPES.includes(sourceObject.type),
    );

    if (clientSupportsMSE && streamingSources.length) {
      return streamingSources;
    }
    return sources;
  }

  getSourcesHTML() {
    const sources = this.getAppropriateSources();
    return sources.reduce(
      (markup, sourceObject) => {
        markup += `<source src="${sourceObject.src}" type="${sourceObject.type}">`;
        return markup;
      },
      '',
    );
  }

  getTracksHTML() {
    return (this._videoData['video-subtitles'] || []).reduce(
      (markup, trackObject) => {
        markup += `<track ${trackObject.default ? 'default ' : ''}src="${trackObject.src}" kind="${trackObject.kind}" srclang="${trackObject.srclang}" label="${trackObject.label}">`;
        return markup;
      },
      '',
    );
  }

  /**
   * Returns a boolean indicating whether any of the video sources
   * point to streaming resources (DASH/HLS).
   *
   * @returns {boolean} Does any video source point to a streaming resource?
   */
  hasStreamingSource() {
    const sources = this._videoData['video-sources'] || [];
    const streamingSources = sources.filter(
      (sourceObject) => STREAMING_MIME_TYPES.includes(sourceObject.type),
    );

    return streamingSources.length > 0;
  }

  render(videoData) {
    this._videoData = videoData;

    const thumbnailUrl = Array.isArray(videoData.thumbnail)
      ? (videoData.thumbnail.find((t) => t.default)).src
      : videoData.thumbnail;

    const markup = `${style}
    <video ${videoData.thumbnail ? `poster="${thumbnailUrl}"` : ''} controls crossorigin="anonymous">
      ${this.getSourcesHTML()}
      ${this.getTracksHTML()}
    </video>
    `;

    while (this.internal.root.firstChild) {
      this.internal.root.removeChild(this.internal.root.firstChild);
    }
    this.internal.root.innerHTML = markup;
    this._videoElement = this.internal.root.querySelector('video');

    this._videoElement.addEventListener('error', this.handleVideoError.bind(this), true);
  }

  /**
   * Handler for errors emitted by the <video> tag or any of its descendants.
   *
   * @param {Event} e Error event.
   */
  handleVideoError(e) {
    const el = e.target;
    const isSourceTag = el.tagName === 'SOURCE';

    if (!isSourceTag) return;

    const allSources = [...this._videoElement.querySelectorAll('source')];
    const lastSource = allSources.pop();
    const isSourceTagLast = lastSource === el;

    /**
     * If an error is invoked on the last source element, it is a signal that
     * the client is not able to natively play one of the provided <source>s.
     *
     * In that case we can take over manually and attempt to pick a streaming
     * source (`.mpd`, `.m3u8`) and play it back through MSE.
     *
     * @see https://html.spec.whatwg.org/multipage/embedded-content.html#the-source-element
     */
    if (isSourceTagLast && this.hasStreamingSource()) {
      this.playStream();
    }
  }

  /**
   * Picks a streaming <source> and plays it using MSE.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
   */
  async playStream() {
    const sourceEls = [...this._videoElement.querySelectorAll('source')];
    const streamingSource = sourceEls.find(
      (sourceEl) => STREAMING_MIME_TYPES.includes(sourceEl.type),
    );

    if (!streamingSource) return;

    const mimeType = streamingSource.type;
    const manifestResponse = await fetch(streamingSource.src);
    const manifestDocument = await manifestResponse.text();

    let parser = null;

    if (mimeType === 'application/dash+xml') {
      parser = new ParserMPD(manifestDocument);
    } else if (mimeType === 'application/vnd.apple.mpegurl') {
      parser = new ParserM3U8(manifestDocument);
    }

    if (!parser) return;

    this.internal.streamer = new Streamer(this._videoElement, parser, {
      manifestSrc: streamingSource.src,
    });
  }
}
