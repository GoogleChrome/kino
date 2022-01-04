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

  // If we can't use the Media Capabilities API, try using `MediaSource.isTypeSupported`.
  if (MediaSource && MediaSource.isTypeSupported) {
    const contentType = configuration.video?.contentType || configuration.audio?.contentType;
    return {
      supported: MediaSource.isTypeSupported(contentType),
      smooth: false,
      powerEfficient: false,
    };
  }

  // Very unlikely any agent would reach this point, but
  // if all fails, pretend we support the source.
  return {
    supported: true,
    smooth: false,
    powerEfficient: false,
  };
}
