import '../../typedefs';
import ParserMPD from '../../modules/ParserMPD.module';
import selectSource from '../../utils/selectSource.module';

/**
 * Returns a list of URLs that need to be downloaded in order to allow
 * offline playback of this resource on this device.
 *
 * @param {string}   videoId Video ID.
 * @param {object[]} sources Video sources.
 *
 * @returns {Promise<FileMeta[]>} Promise resolving to file meta objects.
 */
export const getURLsForDownload = async (videoId, sources) => {
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
       * Generating a data URI gives us a faux-URL that can reliably be used in
       * place of a real URL and even stored in the database for later usage.
       */
      const offlineManifestDataURI = parser.toDataURI();
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

export const a = 1;
