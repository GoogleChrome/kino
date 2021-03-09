import {
  STORAGE_SCHEMA,
  IDB_CHUNK_INDEX,
} from '../constants';

const dbName = 'webdev-offline-storage';
const schemaVersion = 1;

const metaAccessorFactory = (abstractedIDB) => ({
  name: STORAGE_SCHEMA.meta.name,
  key: STORAGE_SCHEMA.meta.key,

  async get(videoId) {
    const defaultValue = {
      videoId,
      progress: 0,
    };
    const transaction = abstractedIDB.db.transaction([this.name], 'readonly');
    const store = transaction.objectStore(this.name);
    const data = await new Promise((resolve, reject) => {
      const request = store.get(videoId);

      request.onsuccess = (e) => resolve(e.target.result || defaultValue);
      request.onerror = () => reject(`Unable to fetch meta information for video: ${videoId}`);
    });

    return data;
  },

  put(videoMetaData) {
    return abstractedIDB.defaultAccesor.put(videoMetaData, this.name);
  },
});

const dataAccessorFactory = (abstractedIDB) => ({
  name: STORAGE_SCHEMA.data.name,

  put(videoData) {
    return abstractedIDB.defaultAccesor.put(videoData, this.name);
  },
});

const fileAccessorFactory = (abstractedIDB) => ({
  name: STORAGE_SCHEMA.filemeta.name,

  /**
   * Returns meta information for a URL.
   *
   * @param {string} url URL for the requested file.
   *
   * @returns {FileMeta|null} File meta information.
   */
  async get(url) {
    /**
     * @type {IDBTransaction}
     */
    const transaction = abstractedIDB.db.transaction([this.name], 'readonly');
    const store = transaction.objectStore(this.name);
    const data = await new Promise((resolve) => {
      const request = store.get(url);

      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve();
    });

    return data;
  },

  /**
   * Returns files associated with a particular video ID.
   *
   * @param {string} videoId Video ID.
   *
   * @returns {FileMeta[]} File meta entries.
   */
  async getByVideoId(videoId) {
    /**
     * @type {IDBTransaction}
     */
    const transaction = abstractedIDB.db.transaction([this.name], 'readonly');
    const store = transaction.objectStore(this.name);
    const idIndex = store.index('videoId');
    const keyRange = IDBKeyRange.only(videoId);

    const data = await new Promise((resolve) => {
      const request = idIndex.openCursor(keyRange);
      const fileMeta = [];
      const cursorReader = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          fileMeta.push(cursor.value);
          cursor.continue();
        } else {
          resolve(fileMeta);
        }
      };

      request.onsuccess = cursorReader;
      request.onerror = () => resolve([]);
    });

    return data;
  },

  put(fileMeta) {
    return abstractedIDB.defaultAccesor.put(fileMeta, this.name);
  },
});

let dbConnection = null;

/**
 * Provides access to video data stored in IDB.
 *
 * @returns {null|Promise<IDBDatabase>} Promise that resolved with `IDBDatabase` instance.
 */
export default () => {
  if (dbConnection) return dbConnection;

  /**
   * Abstraction on top of raw `IDBDatabase` providing convenience access
   * to video meta and data stores.
   *
   * @param {IDBDatabase} idbConnection Connection to an IDB.
   *
   * @returns {object} IDB abstraction instance.
   */
  const dbFactory = (idbConnection) => {
    const abstractedIDB = new class {
      constructor(db) {
        this.db = db;

        this.defaultAccesor = {
          put(data, storeName) {
            const transaction = abstractedIDB.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            return store.put(data);
          },
        };
      }

      unwrap() {
        return this.db;
      }
    }(idbConnection);

    abstractedIDB.meta = metaAccessorFactory(abstractedIDB);
    abstractedIDB.data = dataAccessorFactory(abstractedIDB);
    abstractedIDB.file = fileAccessorFactory(abstractedIDB);

    return abstractedIDB;
  };

  dbConnection = new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, schemaVersion);

    dbRequest.onsuccess = () => resolve(dbFactory(dbRequest.result));
    dbRequest.onerror = (e) => reject(e);

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#creating_or_updating_the_version_of_the_database
     *
     * @param {Event} e Event object.
     */
    dbRequest.onupgradeneeded = (e) => {
      /**
       * @type {IDBDatabase}
       */
      const db = e.target.result;

      /**
       * The `videoMeta` store holds video metadata related to offline serving.
       *
       * Example:
       *
       * Key: sample-video-3
       * Value: { done: true, offset: 5524488, videoId: "sample-video-3" }
       *
       * Value properties:
       *
       * - done    (bool)    Whether the video is done downloading.
       * - offset  (int)     Current download progress in bytes.
       * - videoId (string)  Video ID.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore
       */
      db.createObjectStore(
        STORAGE_SCHEMA.meta.name,
        { keyPath: STORAGE_SCHEMA.meta.key },
      );

      /**
       * The `videoData` store holds actual video data chunks. This one store is used
       * to store video data for all offline videos. Keys are auto generated.
       *
       * Example:
       *
       * Key: <autogenerated>
       * Value: { data: Uint8Array(32547) [...], index: 5, size: 32547, videoId: "video-1" }
       *
       * Value properties:
       *
       * - data    (Uint8Array)  Typed array holding video chunk byte values.
       * - index   (int)         Chunk order in the whole video file.
       * - size    (int)         Chunk size in bytes.
       * - videoId (string)      Video ID.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore
       * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
       */
      const dataOS = db.createObjectStore(STORAGE_SCHEMA.data.name, { autoIncrement: true });

      /**
       * Create a `video ID` index in the data store to be able to
       * retrieve video data chunks by the `videoId` property later.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#structuring_the_database
       */
      dataOS.createIndex(IDB_CHUNK_INDEX, ['url', 'rangeStart', 'rangeEnd'], { unique: true });

      /**
       * File meta storage.
       */
      const fileOS = db.createObjectStore(
        STORAGE_SCHEMA.filemeta.name,
        { keyPath: STORAGE_SCHEMA.filemeta.key },
      );
      fileOS.createIndex('videoId', 'videoId');
    };
  });

  return dbConnection;
};
