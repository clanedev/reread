

export type SectionDoc = {
  id: string;
  href?: string;
  linear?: string;
  createDocument?: () => Promise<Document>;
};

export type BookDoc = {
  metadata?: { title?: string };
  toc?: Array<{ label: string; href: string }>;
  sections: SectionDoc[];
  resolveHref?: (href: string) => { index: number };
};

export type LoadedSection = {
  index: number;
  html: string;
  title: string;
};

export type ArchiveLoader = {
  entries: Array<{ filename: string; uncompressedSize?: number; directory?: boolean }>;
  loadText: (name: string) => Promise<string | null>;
  loadBlob: (name: string, type?: string) => Promise<Blob | null>;
  getSize: (name: string) => number;
};

export async function createArchiveLoader(file: File): Promise<ArchiveLoader> {
  const { BlobReader, BlobWriter, TextWriter, ZipReader, configure } = await import('@zip.js/zip.js');
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
  const { EPUB } = await import('foliate-js/epub.js');
  const loader = await createArchiveLoader(file);
  const book = (await new EPUB(loader).init()) as BookDoc;
  return { loader, book };
}

export function sectionTitle(book: BookDoc, index: number) {
  const tocItem = book.toc?.find((item) => {
    try {
      return book.resolveHref?.(item.href)?.index === index;
    } catch {
      return false;
    }
  });

  return tocItem?.label || book.sections[index]?.href || `Chapter ${index + 1}`;
}

export function resolveEntryPath(rawUrl: string, sectionHref: string) {
  if (!rawUrl || rawUrl.startsWith('#') || /^(?:data|blob|mailto|javascript):/i.test(rawUrl)) {
    return null;
  }

  try {
    const url = new URL(rawUrl, `https://epub.local/${sectionHref.replace(/^\/+/, '')}`);
    if (url.origin !== 'https://epub.local') {
      return null;
    }

    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

export function getEntryCandidates(rawUrl: string, sectionHref: string) {
  const entryPath = resolveEntryPath(rawUrl, sectionHref);
  if (!entryPath) return [];

  const candidates = [entryPath];
  const fileName = entryPath.split('/').pop();
  if (fileName && fileName !== entryPath) {
    candidates.push(fileName);
  }

  return [...new Set(candidates)];
}

export async function findEntryBlob(loader: ArchiveLoader, rawUrl: string, sectionHref: string) {
  for (const candidate of getEntryCandidates(rawUrl, sectionHref)) {
    const blob = await loader.loadBlob(candidate);
    if (blob) return { candidate, blob };
  }

  const entryPath = resolveEntryPath(rawUrl, sectionHref);
  if (!entryPath) return null;

  const fileName = entryPath.split('/').pop();
  if (!fileName) return null;

  const matchedEntry = loader.entries.find((entry) => entry.filename.endsWith(`/${fileName}`) || entry.filename === fileName);
  if (!matchedEntry) return null;

  const blob = await loader.loadBlob(matchedEntry.filename);
  return blob ? { candidate: matchedEntry.filename, blob } : null;
}

export async function resolveAssetUrl(
  rawUrl: string,
  sectionHref: string,
  loader: ArchiveLoader,
  objectUrls: string[],
  cache: Map<string, string>,
) {
  const entryPath = resolveEntryPath(rawUrl, sectionHref);
  if (!entryPath) return rawUrl;

  const cached = cache.get(entryPath) ?? cache.get(entryPath.split('/').pop() ?? '');
  if (cached) return cached;

  const entry = await findEntryBlob(loader, rawUrl, sectionHref);
  if (!entry) return rawUrl;

  const nextUrl = URL.createObjectURL(entry.blob);
  cache.set(entry.candidate, nextUrl);
  cache.set(entry.candidate.split('/').pop() ?? entry.candidate, nextUrl);
  objectUrls.push(nextUrl);
  return nextUrl;
}

export async function rewriteCssUrls(
  cssText: string,
  sectionHref: string,
  loader: ArchiveLoader,
  objectUrls: string[],
  cache: Map<string, string>,
) {
  const pattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  const matches = Array.from(cssText.matchAll(pattern));
  if (!matches.length) return cssText;

  let cursor = 0;
  let output = '';
  for (const match of matches) {
    output += cssText.slice(cursor, match.index);
    const nextUrl = await resolveAssetUrl(match[2], sectionHref, loader, objectUrls, cache);
    output += `url("${nextUrl}")`;
    cursor = (match.index ?? 0) + match[0].length;
  }
  output += cssText.slice(cursor);
  return output;
}

export async function normalizeSectionDocument(
  doc: Document,
  sectionHref: string,
  loader: ArchiveLoader,
  objectUrls: string[],
) {
  const assetCache = new Map<string, string>();
  const headParts: string[] = [];

  for (const node of Array.from(doc.head.children)) {
    if (node.tagName === 'STYLE') {
      const styleText = await rewriteCssUrls(node.textContent ?? '', sectionHref, loader, objectUrls, assetCache);
      headParts.push(`<style>${styleText}</style>`);
      continue;
    }

    if (node.tagName === 'LINK') {
      const rel = node.getAttribute('rel') ?? '';
      const href = node.getAttribute('href') ?? '';
      if (rel.includes('stylesheet') && href) {
        const resolvedPath = resolveEntryPath(href, sectionHref);
        const candidates = resolvedPath ? [resolvedPath, resolvedPath.split('/').pop() ?? ''] : [];
        let cssText: string | null = null;
        for (const candidate of candidates) {
          if (!candidate) continue;
          cssText = await loader.loadText(candidate);
          if (cssText) break;
        }
        if (cssText) {
          const rewrittenCss = await rewriteCssUrls(cssText, sectionHref, loader, objectUrls, assetCache);
          headParts.push(`<style>${rewrittenCss}</style>`);
          continue;
        }
      }
    }
  }

  for (const node of Array.from(doc.body.querySelectorAll<HTMLElement>('*'))) {
    for (const attrName of node.getAttributeNames()) {
      const value = node.getAttribute(attrName);
      if (!value) continue;

      if (attrName === 'src' || attrName === 'poster' || attrName === 'href' || attrName === 'xlink:href') {
        const nextValue = await resolveAssetUrl(value, sectionHref, loader, objectUrls, assetCache);
        if (attrName === 'xlink:href' && node instanceof SVGElement) {
          node.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', nextValue);
          node.setAttribute('href', nextValue);
        } else {
          node.setAttribute(attrName, nextValue);
        }
        continue;
      }

      if (attrName === 'srcset') {
        const nextSrcset = [];
        for (const candidate of value.split(',')) {
          const trimmed = candidate.trim();
          if (!trimmed) continue;
          const [url, ...descriptorParts] = trimmed.split(/\s+/);
          const nextUrl = await resolveAssetUrl(url, sectionHref, loader, objectUrls, assetCache);
          nextSrcset.push([nextUrl, ...descriptorParts].join(' '));
        }
        node.setAttribute('srcset', nextSrcset.join(', '));
        continue;
      }

      if (attrName === 'style') {
        node.setAttribute('style', await rewriteCssUrls(value, sectionHref, loader, objectUrls, assetCache));
      }
    }
  }

  return `${headParts.join('')}<div class="reader-section-body">${doc.body.innerHTML}</div>`;
}

export async function loadSectionHtml(book: BookDoc, index: number, loader: ArchiveLoader, objectUrls: string[]) {
  const section = book.sections[index];
  if (!section?.createDocument) {
    throw new Error(`Section ${index + 1} is not available.`);
  }

  const doc = await section.createDocument();
  return normalizeSectionDocument(doc, section.href ?? '', loader, objectUrls);
}

export function initialSectionIndex(book: BookDoc) {
  const firstTocHref = book.toc?.[0]?.href;
  if (firstTocHref && book.resolveHref) {
    try {
      return book.resolveHref(firstTocHref).index;
    } catch {
      return 0;
    }
  }

  return 0;
}
