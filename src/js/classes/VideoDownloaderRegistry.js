import VideoDownloader from '../web-components/video-download/VideoDownloader';

/**
 * The `VideoDownloader` web component contains a download method that is potentially
 * long running. This registry allows different pages to share a single `VideoDownloader`
 * instance per videoId.
 *
 * This helps maintain the component's state even across page loads.
 */
export default class VideoDownloaderRegistry {
  constructor({ connectionStatus }) {
    this.instances = new Map();
    this.connectionStatus = connectionStatus;
  }

  /**
   * Creates a new `VideoDownloader` instance for the given `videoId`.
   *
   * @param {string} videoId   Video ID.
   *
   * @returns {VideoDownloader} Instantiated VideoDownloader.
   */
  create(videoId) {
    this.instances.set(videoId, new VideoDownloader({ connectionStatus: this.connectionStatus }));

    return this.instances.get(videoId);
  }

  /**
   * Returns a previously instantiated VideoDownloader.
   *
   * @param {string} videoId Get the `VideoDownloader` instance for this video id.
   *
   * @returns {VideoDownloader|null} `VideoDownloader` instance.
   */
  get(videoId) {
    return this.instances.get(videoId) || null;
  }

  /**
   * Returns an iterator over all stored instances.
   *
   * @returns {Iterator<string, VideoDownloader>} Iterator over all VideoDownloader instance.
   */
  getAll() {
    return this.instances.entries();
  }

  /**
   * Detaches the `VideoDownload` instances and leaves them to be
   * garbage collected.
   */
  destroyAll() {
    this.instances.clear();
  }
}
