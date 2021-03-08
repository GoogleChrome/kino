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
 * @returns {Promise<FileMeta[]>} Promise resolving to File Meta objects to be downloaded.
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
       * We need to download the altered manifest without the extraneous representations.
       *
       * Converting the manifest document to Blob and creating URL for it does the job.
       */
      const offlineManifestURL = URL.createObjectURL(parser.toBlob());
      const manifestTuple = ['manifest', offlineManifestURL];
      URLTuples = parser.listAllChunkURLs([manifestTuple]);
    } else {
      return [];
    }
  } else {
    URLTuples = [[videoId, selectedSource.src]];
  }

  return URLTuples.map(
    ([id, url]) => ({
      id,
      url,
      bytesDownloaded: 0,
      bytesTotal: null,
      done: false,
    }),
  );
};

export const a = 1;
