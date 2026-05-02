import { openDB } from 'idb';
import type { BookProgress, ReaderPreferences } from './types';
import { DEFAULT_READER_TYPOGRAPHY } from './theme';

const DB_NAME = 'reread-reader-db';
const DB_VERSION = 1;
const PREFS_STORE = 'reader_prefs';
const PROGRESS_STORE = 'reader_progress';
const PREFS_KEY = 'global';

let dbPromise: ReturnType<typeof openDB> | null = null;

function getDB() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available.');
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PREFS_STORE)) {
          db.createObjectStore(PREFS_STORE);
        }

        if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
          const store = db.createObjectStore(PROGRESS_STORE, { keyPath: 'bookId' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }

  return dbPromise;
}

export async function getReaderPreferences() {
  const db = await getDB();
  return (await db.get(PREFS_STORE, PREFS_KEY)) as ReaderPreferences | undefined;
}

export async function setReaderPreferences(preferences: ReaderPreferences) {
  const db = await getDB();
  await db.put(PREFS_STORE, preferences, PREFS_KEY);
}

export async function getBookProgress(bookId: string) {
  const db = await getDB();
  return (await db.get(PROGRESS_STORE, bookId)) as BookProgress | undefined;
}

export async function setBookProgress(progress: BookProgress) {
  const db = await getDB();
  await db.put(PROGRESS_STORE, progress);
}

export function createDefaultReaderPreferences(): ReaderPreferences {
  return {
    ...DEFAULT_READER_TYPOGRAPHY,
    updatedAt: Date.now(),
  };
}
