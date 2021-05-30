import { SW_CACHE_NAME } from '../constants';

/**
 * Returns a `VideoDownloader` object for a given video ID.
 *
 * @param {VideoDownloaderRegistry} videoDownloaderRegistry Registry.
 * @param {object} videoData Video data.
 * @returns {VideoDownloader} `VideoDownloader` instance.
 */
export default (videoDownloaderRegistry, videoData) => {
  let downloader = videoDownloaderRegistry.get(videoData.id);
  if (!downloader) {
    downloader = videoDownloaderRegistry.create(videoData.id);
    downloader.init(videoData, SW_CACHE_NAME);
  }
  downloader.setAttribute('expanded', 'false');

  return downloader;
};
