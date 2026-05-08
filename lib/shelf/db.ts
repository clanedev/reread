import { openDB } from 'idb';
import type { ShelfState } from './types';

const DB_NAME = 'reread-db';
const DB_VERSION = 5;
const SHELF_STORE = 'shelf';
const BOOKS_STORE = 'books';
const STATE_KEY = 'state';

let dbPromise: ReturnType<typeof openDB> | null = null;

export interface EpubBookRecord {
  contentKey: string;
  fingerprintKey?: string;
  dirKey?: string;
  fileName?: string;
  identifier: string | null;
  title: string | null;
  author: string | null;
  modified: string | null;
  coverBlob: Blob | null;
  updatedAt: number;
}

function getDB() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available.');
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains(SHELF_STORE)) {
          db.createObjectStore(SHELF_STORE);
        }

        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          const store = db.createObjectStore(BOOKS_STORE, { keyPath: 'contentKey' });
          store.createIndex('fingerprintKey', 'fingerprintKey');
        }

        if (oldVersion < 5) {
          const booksStore = transaction.objectStore(BOOKS_STORE);
          const merged = new Map<string, EpubBookRecord>();

          if (db.objectStoreNames.contains('epub-books')) {
            const legacyBooks = (await transaction.objectStore('epub-books').getAll()) as EpubBookRecord[];
            for (const record of legacyBooks) {
              merged.set(record.contentKey, record);
            }
          }

          if (db.objectStoreNames.contains('epub-fingerprints')) {
            const legacyFingerprints = (await transaction.objectStore('epub-fingerprints').getAll()) as Array<{
              fingerprintKey: string;
              contentKey: string;
              updatedAt: number;
            }>;
            for (const record of legacyFingerprints) {
              const existing = merged.get(record.contentKey);
              if (existing) {
                existing.fingerprintKey = record.fingerprintKey;
                existing.updatedAt = Math.max(existing.updatedAt, record.updatedAt);
              } else {
                merged.set(record.contentKey, {
                  contentKey: record.contentKey,
                  fingerprintKey: record.fingerprintKey,
                  identifier: null,
                  title: null,
                  author: null,
                  modified: null,
                  coverBlob: null,
                  updatedAt: record.updatedAt,
                });
              }
            }
          }

          if (db.objectStoreNames.contains('epub-book-locations')) {
            const legacyLocations = (await transaction.objectStore('epub-book-locations').getAll()) as Array<{
              contentKey: string;
              dirKey: string;
              fileName: string;
              updatedAt: number;
            }>;
            for (const record of legacyLocations) {
              const existing = merged.get(record.contentKey);
              if (existing) {
                existing.dirKey = record.dirKey;
                existing.fileName = record.fileName;
                existing.updatedAt = Math.max(existing.updatedAt, record.updatedAt);
              } else {
                merged.set(record.contentKey, {
                  contentKey: record.contentKey,
                  dirKey: record.dirKey,
                  fileName: record.fileName,
                  identifier: null,
                  title: null,
                  author: null,
                  modified: null,
                  coverBlob: null,
                  updatedAt: record.updatedAt,
                });
              }
            }
          }

          for (const record of merged.values()) {
            await booksStore.put(record);
          }

          if (db.objectStoreNames.contains('epub-books')) {
            db.deleteObjectStore('epub-books');
          }
          if (db.objectStoreNames.contains('epub-fingerprints')) {
            db.deleteObjectStore('epub-fingerprints');
          }
          if (db.objectStoreNames.contains('epub-book-locations')) {
            db.deleteObjectStore('epub-book-locations');
          }
        }
      },
    });
  }

  return dbPromise;
}

export async function getShelfState() {
  const db = await getDB();
  return (await db.get(SHELF_STORE, STATE_KEY)) as ShelfState | undefined;
}

export async function setShelfState(state: ShelfState) {
  const db = await getDB();
  await db.put(SHELF_STORE, state, STATE_KEY);
}

export async function clearShelfState() {
  const db = await getDB();
  await db.delete(SHELF_STORE, STATE_KEY);
}

export async function getEpubBookRecord(contentKey: string) {
  const db = await getDB();
  return (await db.get(BOOKS_STORE, contentKey)) as EpubBookRecord | undefined;
}

export async function getEpubBookRecordByFingerprint(fingerprintKey: string) {
  const db = await getDB();
  return (await db.getFromIndex(BOOKS_STORE, 'fingerprintKey', fingerprintKey)) as EpubBookRecord | undefined;
}

export async function setEpubBookRecord(record: EpubBookRecord) {
  const db = await getDB();
  await db.put(BOOKS_STORE, record);
}
