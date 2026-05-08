export type SectionDoc = {
  id: string;
  href?: string;
  linear?: string;
  size?: number;
  cfi?: string;
  createDocument?: () => Promise<Document>;
};

export type BookDoc = {
  metadata?: { title?: string };
  toc?: Array<{ label: string; href: string }>;
  sections: SectionDoc[];
  resolveHref?: (href: string) => { index: number };
  resolveCFI?: (cfi: string) => { index: number };
};

export type ArchiveLoader = {
  entries: Array<{ filename: string; uncompressedSize?: number; directory?: boolean }>;
  loadText: (name: string) => Promise<string | null>;
  loadBlob: (name: string, type?: string) => Promise<Blob | null>;
  getSize: (name: string) => number;
};

export async function createArchiveLoader(file: File): Promise<ArchiveLoader> {
  const { BlobReader, BlobWriter, TextWriter, ZipReader, configure } = await import("@zip.js/zip.js");
  configure({ useWebWorkers: false });

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

export async function parseBook(file: File) {
  const { EPUB } = await import("foliate-js/epub.js");
  const loader = await createArchiveLoader(file);
  const book = (await new EPUB(loader).init()) as BookDoc;
  return { loader, book };
}
