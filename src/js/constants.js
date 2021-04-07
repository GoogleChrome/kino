/**
 * Service Worker Cache Name.
 *
 * Please note that SW_CACHE_FORMAT represents the cache name
 * format for caches used to precache assets.
 *
 * There may be adjacent caches used for other purposes and we
 * want to let the SW know which caches it should purge on upgrade.
 */
export const SW_CACHE_NAME = 'static-assets-v1.0.0-alpha6';
export const SW_CACHE_FORMAT = /^static-assets-v[a-z0-9.-]+$/;

/**
 * App Shell URL
 */
export const APP_SHELL_URL = '/';

/**
 * Media Server Hostname
 */
export const MEDIA_SERVER_ORIGIN = 'https://storage.googleapis.com/wdm-assets/';

/**
 * IDB Storage Schema.
 */
export const STORAGE_SCHEMA = {
  meta: {
    name: 'videoMeta',
    key: 'videoId',
  },
  data: {
    name: 'videoData',
  },
  filemeta: {
    name: 'fileMeta',
    key: 'url',
  },
};

/**
 * IDB Index name used to access individual stored video chunks.
 */
export const IDB_CHUNK_INDEX = 'video-chunk';

/**
 * Default artwork metadata used by Media Session API.
 */
export const MEDIA_SESSION_DEFAULT_ARTWORK = [
  { src: '/images/media-session/artwork-96x96.jpg', sizes: '96x96', type: 'image/jpeg' },
  { src: '/images/media-session/artwork-128x128.jpg', sizes: '128x128', type: 'image/jpeg' },
  { src: '/images/media-session/artwork-192x192.jpg', sizes: '192x192', type: 'image/jpeg' },
  { src: '/images/media-session/artwork-256x256.jpg', sizes: '256x256', type: 'image/jpeg' },
  { src: '/images/media-session/artwork-384x384.jpg', sizes: '384x384', type: 'image/jpeg' },
  { src: '/images/media-session/artwork-512x512.jpg', sizes: '512x512', type: 'image/jpeg' },
];

/**
 * MIME types associated with video streaming sources.
 */
export const STREAMING_MIME_TYPES = [
  'application/dash+xml',
  'application/vnd.apple.mpegurl', // <-- HLS (m3u8)
];

/**
 * Streams that the application is able to play through MSE.
 */
export const SUPPORTED_STREAMING_MIME_TYPES = [
  'application/dash+xml',
];

/**
 * Some video types and codecs leads to smaller file sizes
 * for comparable video qualities.
 *
 * If the client supports those, we want to prioritize those sources
 * over the others available in the MPD manifest.
 */
export const DEFAULT_VIDEO_PRIORITIES = [
  '[mimeType="video/webm"][codecs^="vp09"]',
  '[mimeType="video/webm"]',
  '[mimeType="video/mp4"]',
  '',
];

/**
 * Same for audio, but right now we have no real preference here.
 */
export const DEFAULT_AUDIO_PRIORITIES = [
  '[mimeType="audio/mp4"]',
  '',
];

/**
 * A stream can be composed from multiple media, e.g. video, audio, subtitles etc.
 *
 * These are all the types the Streamer has support for.
 */
export const ALL_STREAM_TYPES = ['audio', 'video'];

/**
 * Settings key names.
 */
export const SETTING_KEY_TOGGLE_OFFLINE = 'toggle-offline';
export const SETTING_KEY_DARK_MODE = 'dark-mode';

/**
 * Event name signalling that data in IDB has changes.
 */
export const IDB_DATA_CHANGED_EVENT = 'idb-data-changed';
