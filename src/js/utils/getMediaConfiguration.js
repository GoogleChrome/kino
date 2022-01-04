import getRepresentationMimeString from './getRepresentationMimeString';

/**
 * Returns a Media configuration object for a given
 * stream video representation.
 *
 * @param {object} representation MPEG DASH representation data.
 * @param {string} representation.bandwidth Video bandwidth.
 * @param {string} representation.codecs    Codecs string.
 * @param {string} representation.frameRate Framerate info.
 * @param {string} representation.height    Video height in pixels.
 * @param {string} representation.mimeType  Video MIME.
 * @param {string} representation.width     Video width in pixels.
 * @returns {MediaConfiguration} Media configuration object.
 */
export function getMediaConfigurationVideo(representation) {
  /**
   * Framerate can be specified as `frameRate: "24000/1001"` in the representation.
   *
   * We need to convert it to a float.
   */
  const framerateChunks = representation.frameRate.split('/');
  let framerate = parseFloat(representation.frameRate);

  if (framerateChunks.length === 2) {
    framerate = parseFloat(framerateChunks[0]) / parseFloat(framerateChunks[1]);
  }

  return {
    type: 'media-source',
    video: {
      contentType: getRepresentationMimeString(representation),
      width: parseInt(representation.width, 10),
      height: parseInt(representation.height, 10),
      bitrate: parseInt(representation.bandwidth, 10),
      framerate,
    },
  };
}

/**
 * Returns a Media configuration object for a given
 * stream audio representation.
 *
 * @param {object}  representation                   MPEG DASH representation data.
 * @param {string}  representation.bandwidth         Audio bandwidth.
 * @param {string}  representation.codecs            Codecs string.
 * @param {string}  representation.audioSamplingRate Audio sampling rate.
 * @param {string}  representation.mimeType          Audio MIME.
 * @param {Element} representation.element           Representation XML node.
 * @returns {MediaConfiguration} Media configuration object.
 */
export function getMediaConfigurationAudio(representation) {
  /**
   * Sensible default, but we'll try to find out the actual value.
   */
  let channels = 2;

  if (representation.element) {
    const acc = representation.element.querySelector('AudioChannelConfiguration');

    if (acc) {
      channels = parseInt(acc.getAttribute('value'), 10);
    }
  }

  return {
    type: 'media-source',
    audio: {
      contentType: getRepresentationMimeString(representation),
      bitrate: parseInt(representation.bandwidth, 10),
      samplerate: parseInt(representation.audioSamplingRate, 10),
      channels,
    },
  };
}
