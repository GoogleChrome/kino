/**
 * Heuristic method to get MIME type of a file.
 *
 * @param {string} url File URL.
 *
 * @returns {string} Video MIME type string.
 */
export default function getMimeByURL(url) {
  const URLObject = new URL(url);
  const extensionMatch = URLObject.pathname.match(/\.([a-z0-9]{3,4})$/);
  const extension = extensionMatch.length === 2 ? extensionMatch[1] : null;
  const extensions = new Map([
    ['mp4', 'video/mp4'],
    ['webm', 'video/webm'],
    ['ogv', 'video/ogg'],
    ['mpeg', 'video/mpeg'],
    ['mov', 'video/quicktime'],
    ['avi', 'video/x-msvideo'],
    ['ts', 'video/mp2t'],
    ['3gp', 'video/3gpp'],
    ['3g2', 'video/3gpp2'],
    ['wmv', 'video/x-ms-wmv'],
    ['flv', 'video/x-flv'],
    ['m4s', 'video/iso.segment'],
    ['m4a', 'audio/mp4'],
    ['m4s', 'video/iso.segment'],
    ['mpd', 'application/dash+xml'],
  ]);

  if (extensions.has(extension)) {
    return extensions.get(extension);
  }
  return 'application/octet-stream';
}
