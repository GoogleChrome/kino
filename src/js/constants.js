/**
 * Service Worker Cache Name.
 */
export const SW_CACHE_NAME = 'v1';

/**
 * IDB Storage Schema.
 */
export const STORAGE_SCHEMA = {
  meta: {
    name: 'videoMeta',
    key: 'url',
  },
  data: {
    name: 'videoData',
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
 * Media Server URL.
 */
export const MEDIA_SERVER_URL = 'https://storage.googleapis.com/wdm-assets';
