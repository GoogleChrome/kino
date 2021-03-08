/**
 * Returns the MIME type for a representation.
 *
 * @param {object} representation Information about the representation.
 *
 * @returns {string} MIME type, optionally with codecs string, too.
 */
export default (representation) => (representation.mimeType && representation.codecs
  ? `${representation.mimeType}; codecs="${representation.codecs}"`
  : `${representation.mimeType}`);
