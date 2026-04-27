import { openDB } from 'idb';
import type { ShelfState } from './types';

const DB_NAME = 'reread-db';
const DB_VERSION = 1;
const STORE_NAME = 'shelf';
const STATE_KEY = 'state';

let dbPromise: ReturnType<typeof openDB> | null = null;

function getDB() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available.');
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  return dbPromise;
}

export async function getShelfState() {
  const db = await getDB();
  return (await db.get(STORE_NAME, STATE_KEY)) as ShelfState | undefined;
}

export async function setShelfState(state: ShelfState) {
  const db = await getDB();
  await db.put(STORE_NAME, state, STATE_KEY);
}

export async function clearShelfState() {
  const db = await getDB();
  await db.delete(STORE_NAME, STATE_KEY);
}
