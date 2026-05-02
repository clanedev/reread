import { openDB } from 'idb';
import type { ShelfState } from './types';

const DB_NAME = 'reread-db';
const DB_VERSION = 3;
const SHELF_STORE = 'shelf';
const EPUB_FINGERPRINT_STORE = 'epub-fingerprints';
const EPUB_BOOK_STORE = 'epub-books';
const STATE_KEY = 'state';

let dbPromise: ReturnType<typeof openDB> | null = null;

export interface EpubFingerprintRecord {
  fingerprintKey: string;
  contentKey: string;
  updatedAt: number;
}

export interface EpubBookRecord {
  contentKey: string;
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
      upgrade(db) {
        if (!db.objectStoreNames.contains(SHELF_STORE)) {
          db.createObjectStore(SHELF_STORE);
        }

        if (!db.objectStoreNames.contains(EPUB_FINGERPRINT_STORE)) {
          db.createObjectStore(EPUB_FINGERPRINT_STORE);
        }

        if (!db.objectStoreNames.contains(EPUB_BOOK_STORE)) {
          db.createObjectStore(EPUB_BOOK_STORE);
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

export async function getEpubFingerprintRecord(fingerprintKey: string) {
  const db = await getDB();
  return (await db.get(EPUB_FINGERPRINT_STORE, fingerprintKey)) as EpubFingerprintRecord | undefined;
}

export async function setEpubFingerprintRecord(record: EpubFingerprintRecord) {
  const db = await getDB();
  await db.put(EPUB_FINGERPRINT_STORE, record, record.fingerprintKey);
}

export async function getEpubBookRecord(contentKey: string) {
  const db = await getDB();
  return (await db.get(EPUB_BOOK_STORE, contentKey)) as EpubBookRecord | undefined;
}

export async function setEpubBookRecord(record: EpubBookRecord) {
  const db = await getDB();
  await db.put(EPUB_BOOK_STORE, record, record.contentKey);
}
