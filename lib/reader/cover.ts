import { EPUB } from 'foliate-js/epub.js';
import { configure, BlobReader, BlobWriter, TextWriter, ZipReader } from '@zip.js/zip.js';
import {
  getEpubBookRecord,
  getEpubBookRecordByFingerprint,
  setEpubBookRecord,
  type EpubBookRecord,
} from '@/lib/shelf/db';

configure({ useWebWorkers: false });

const CONTENT_HASH_WINDOW = 64 * 1024;

type ArchiveLoader = {
  entries: Array<{ filename: string; directory?: boolean; uncompressedSize?: number }>;
  loadText: (name: string) => Promise<string | null>;
  loadBlob: (name: string, type?: string) => Promise<Blob | null>;
  getSize: (name: string) => number;
};

type EpubBook = {
  metadata?: Record<string, unknown>;
  getCover?: () => Promise<Blob | null>;
};

type EpubPreview = EpubBookRecord;

function makeFingerprintKey(file: File) {
  return `fp:${file.name}:${file.size}:${file.lastModified}`;
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = firstString(item);
      if (text) return text;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      const text = firstString(nested);
      if (text) return text;
    }
  }

  return null;
}

function readBookMetadata(metadata: Record<string, unknown> | undefined) {
  return {
    identifier: firstString(metadata?.identifier),
    title: firstString(metadata?.title),
    author: firstString(metadata?.author),
    modified: firstString(metadata?.modified),
  };
}

async function sha256Hex(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function makeContentKey(file: File) {
  const head = await file.slice(0, CONTENT_HASH_WINDOW).arrayBuffer();
  const tailStart = Math.max(0, file.size - CONTENT_HASH_WINDOW);
  const tail = tailStart > 0 ? await file.slice(tailStart).arrayBuffer() : new ArrayBuffer(0);

  const headBytes = new Uint8Array(head);
  const tailBytes = new Uint8Array(tail);
  const combined = new Uint8Array(headBytes.length + tailBytes.length);
  combined.set(headBytes, 0);
  combined.set(tailBytes, headBytes.length);

  return await sha256Hex(combined.buffer);
}

async function makeLoader(file: File): Promise<ArchiveLoader> {
  const reader = new ZipReader(new BlobReader(file));
  const entries = await reader.getEntries();
  const map = new Map(entries.map((entry) => [entry.filename, entry]));

  return {
    entries,
    loadText: async (name: string) => {
      const entry = map.get(name);
      return entry && !entry.directory ? entry.getData(new TextWriter()) : null;
    },
    loadBlob: async (name: string, type?: string) => {
      const entry = map.get(name);
      return entry && !entry.directory ? entry.getData(new BlobWriter(type)) : null;
    },
    getSize: (name: string) => map.get(name)?.uncompressedSize ?? 0,
  };
}

export async function loadEpubPreview(file: File): Promise<EpubPreview> {
  const fingerprintKey = makeFingerprintKey(file);
  const fingerprintRecord = await getEpubBookRecordByFingerprint(fingerprintKey);
  if (fingerprintRecord) {
    return fingerprintRecord;
  }

  const contentKey = await makeContentKey(file);
  const cachedBook = await getEpubBookRecord(contentKey);
  if (cachedBook) {
    const nextRecord = {
      ...cachedBook,
      fingerprintKey,
      updatedAt: Date.now(),
    } satisfies EpubBookRecord;
    await setEpubBookRecord(nextRecord);
    return nextRecord;
  }

  const loader = await makeLoader(file);
  const book = (await new EPUB(loader).init()) as EpubBook;
  const metadata = readBookMetadata(book.metadata);
  const coverBlob = book.getCover ? await book.getCover() : null;

  const record: EpubBookRecord = {
    contentKey,
    fingerprintKey,
    identifier: metadata.identifier,
    title: metadata.title,
    author: metadata.author,
    modified: metadata.modified,
    coverBlob,
    updatedAt: Date.now(),
  };

  await setEpubBookRecord(record);
  return record;
}

export async function extractEpubCover(file: File) {
  const preview = await loadEpubPreview(file);
  return preview.coverBlob;
}
