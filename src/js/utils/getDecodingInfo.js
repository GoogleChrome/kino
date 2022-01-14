/**
 * Returns decoding info for a given media configuration.
 *
 * @param {MediaDecodingConfiguration} mediaConfig Media configuration.
 * @returns {Promise<MediaCapabilitiesInfo>} Media decoding information.
 */
export default async function getDecodingInfo(mediaConfig) {
  const promise = new Promise((resolve, reject) => {
    if (!('mediaCapabilities' in navigator)) {
      return reject('MediaCapabilities API not available');
    }
    if (!('decodingInfo' in navigator.mediaCapabilities)) {
      return reject('Decoding Info not available');
    }

    // eslint-disable-next-line compat/compat
    return resolve(navigator.mediaCapabilities.decodingInfo(mediaConfig));
  });

  return promise.catch(() => {
    const fallbackResult = {
      supported: false,
      smooth: false, // always false
      powerEfficient: false, // always false
    };

    if ('video' in mediaConfig) {
      fallbackResult.supported = MediaSource.isTypeSupported(mediaConfig.video.contentType);
      if (!fallbackResult.supported) {
        return fallbackResult;
      }
    }

    if ('audio' in mediaConfig) {
      fallbackResult.supported = MediaSource.isTypeSupported(mediaConfig.audio.contentType);
    }
    return fallbackResult;
  });
}
