import '../typedefs';
import ParserMPD from '../classes/ParserMPD';
import selectSource from './selectSource';

/**
 * Returns a list of URLs that need to be downloaded in order to allow
 * offline playback of this resource on this device.
 *
 * @param {string}   videoId Video ID.
 * @param {object[]} sources Video sources.
 * @returns {Promise<FileMeta[]>} Promise resolving to file meta objects.
 */
export default async (videoId, sources) => {
  let URLTuples = [];
  const selectedSource = selectSource(sources);

  /**
   * If this is a streamed video, we need to read the manifest
   * first and generate a list of files to be downloaded.
   */
  if (selectedSource?.canPlayTypeMSE) {
    const response = await fetch(selectedSource.src);
    const responseText = await response.text();
    const parser = new ParserMPD(responseText, selectedSource.src);

    /**
     * This removes all but one audio and video representations from the manifest.
     */
    const offlineGenerated = parser.prepareForOffline();
    if (offlineGenerated) {
      /**
       * The manifest data has been changed in memory. We need to persist the changes.
       * Generating a data URI gives us a stable faux-URL that can reliably be used in
       * place of a real URL and even stored in the database for later usage.
       *
       * Note: the offline manifest file is pretty small in size (several kBs max),
       *       making it a good candidate for a data URI.
       */
      const offlineManifestDataURI = parser.toDataURI();

      /**
       * For most files, the `url` and `downloadUrl` are the same thing – see
       * `listAllChunkURLs` source code.
       *
       * The only exception are the manifest files, where the `downloadUrl` is a separate data URI,
       * whereas the `url` is the original URL of the manifest.
       *
       * This allows us to intercept requests for the original manifest file, but serve our
       * updated version of the manifest.
       */
      const manifestTuple = [selectedSource.src, offlineManifestDataURI];

      URLTuples = parser.listAllChunkURLs([manifestTuple]);
    } else {
      return [];
    }
  } else {
    URLTuples = [[selectedSource.src, selectedSource.src]];
  }

  const fileMeta = URLTuples.map(
    ([url, downloadUrl]) => ({
      url,
      downloadUrl,
      videoId,
      bytesDownloaded: 0,
      bytesTotal: null,
      done: false,
    }),
  );

  return fileMeta;
};
