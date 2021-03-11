import VideoDownloader from '../components/VideoDownloader';

/**
 * The `VideoDownloader` web component contains a download method that is potentially
 * long running. This registry allows different pages to share a single `VideoDownloader`
 * instance per videoId.
 *
 * This helps maintain the component's state even across page loads.
 */
export default class VideoDownloaderRegistry {
  constructor() {
    this.instances = {};
  }

  /**
   * Creates a new `VideoDownloader` instance for the given `videoId`.
   *
   * @param {string} videoId   Video ID.
   *
   * @returns {VideoDownloader} Instantiated VideoDownloader.
   */
  create(videoId) {
    this.instances[videoId] = new VideoDownloader();

    return this.instances[videoId];
  }

  /**
   * Returns a previously instantiated VideoDownloader.
   *
   * @param {string} videoId Get the `VideoDownloader` instance for this video id.
   *
   * @returns {VideoDownloader|null} `VideoDownloader` instance.
   */
  get(videoId) {
    return this.instances[videoId] || null;
  }

  /**
   * Detaches the `VideoDownload` instances and leaves them to be
   * garbage collected.
   */
  destroyAll() {
    this.instances = {};
  }
}
