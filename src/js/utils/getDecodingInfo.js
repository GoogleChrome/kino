/**
 * Returns decoding info for a given media configuration.
 *
 * @param {MediaDecodingConfiguration} configuration Media configuration.
 * @returns {Promise<MediaCapabilitiesInfo>} Media decoding information.
 */
export default async function getDecodingInfo(configuration) {
  if (navigator.mediaCapabilities) {
    return navigator.mediaCapabilities.decodingInfo(configuration);
  }

  // If we can't use the Media Capabilities API, try using `canPlayType`.
  try {
    const videoEl = document.createElement('video');
    const typeString = configuration.audio.contentType || configuration.video.contentType;
    const canPlay = videoEl.canPlayType(typeString);

    return {
      supported: canPlay === 'probably' || canPlay === 'maybe',
      smooth: false,
      powerEfficient: false,
    };
  } catch (error) {
    // Fail quietly.
  }

  // Very unlikely any agent would reach this point, but
  // if all fails, pretend we support the source.
  return {
    supported: true,
    smooth: false,
    powerEfficient: false,
  };
}
