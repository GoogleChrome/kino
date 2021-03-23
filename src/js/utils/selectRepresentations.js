import getRepresentationMimeString from './getRepresentationMimeString';

import {
  DEFAULT_AUDIO_PRIORITIES,
  DEFAULT_VIDEO_PRIORITIES,
  ALL_STREAM_TYPES,
} from '../constants';

/**
 * Fetch all representations present in the MPD file and filter
 * those that the current client can't play out.
 *
 * @param {object} parser MPD parser instance.
 * @param {object} opts   Options.
 *
 * @returns {object[]} All representations that the current client is able to play.
 */
export default (parser, opts = {}) => {
  const videoEl = document.createElement('video');
  /**
   * Returns whether the provided representation is playable by the current client.
   *
   * @param {object} representation Representation object returned by parser.queryRepresentations.
   *
   * @returns {boolean} Is this representation playable by the current client.
   */
  const canPlayFilter = (representation) => {
    const testMime = getRepresentationMimeString(representation);
    return videoEl.canPlayType(testMime) === 'probably';
  };

  const representations = {};
  const priorities = {
    video: opts.videoPriorities || DEFAULT_VIDEO_PRIORITIES,
    audio: opts.audioPriorities || DEFAULT_AUDIO_PRIORITIES,
  };

  /**
   * Select sets of video and audio representations that are playable
   * in the client with respect to indicated priorities.
   */
  ALL_STREAM_TYPES.forEach(
    (contentType) => {
      let query;
      do {
        query = priorities[contentType].shift() || '';

        /**
         * @todo Support languages other than the hardcoded English.
         */
        representations[contentType] = parser.queryRepresentations(query, contentType, 'eng');
        representations[contentType] = representations[contentType].filter(canPlayFilter);
      } while (representations[contentType].length === 0);
    },
  );

  if (representations.video.length === 0) {
    throw new Error('[Streamer] No playable video representation found.');
  }

  return representations;
};
