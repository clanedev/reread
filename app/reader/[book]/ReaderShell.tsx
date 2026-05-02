'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createDefaultReaderPreferences, getReaderPreferences, setReaderPreferences } from '@/lib/reader/db';
import { loadBookProgress, storeBookProgress } from '@/lib/reader/progress';
import { resolveReaderThemeColors } from '@/lib/reader/theme';
import type { BookProgress, ReaderPreferences } from '@/lib/reader/types';

type SectionDoc = {
  id: string;
  href?: string;
  linear?: string;
  createDocument?: () => Promise<Document>;
};

type BookDoc = {
  metadata?: { title?: string };
  toc?: Array<{ label: string; href: string }>;
  sections: SectionDoc[];
  resolveHref?: (href: string) => { index: number };
};

type LoadedSection = {
  index: number;
  html: string;
  title: string;
};

type ArchiveLoader = {
  entries: Array<{ filename: string; uncompressedSize?: number }>;
  loadText: (name: string) => Promise<string | null>;
  loadBlob: (name: string, type?: string) => Promise<Blob | null>;
  getSize: (name: string) => number;
};

function sectionTitle(book: BookDoc, index: number) {
  const tocItem = book.toc?.find((item) => {
    try {
      return book.resolveHref?.(item.href)?.index === index;
    } catch {
      return false;
    }
  });
  return tocItem?.label || book.sections[index]?.href || `Chapter ${index + 1}`;
}

function resolveEntryPath(rawUrl: string, sectionHref: string) {
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

function getEntryCandidates(rawUrl: string, sectionHref: string) {
  const entryPath = resolveEntryPath(rawUrl, sectionHref);
  if (!entryPath) return [];

  const candidates = [entryPath];
  const fileName = entryPath.split('/').pop();
  if (fileName && fileName !== entryPath) {
    candidates.push(fileName);
  }
  return [...new Set(candidates)];
}

async function findEntryBlob(loader: ArchiveLoader, rawUrl: string, sectionHref: string) {
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

async function resolveAssetUrl(
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

async function rewriteCssUrls(
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

async function normalizeSectionDocument(
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

async function loadSectionHtml(book: BookDoc, index: number, loader: ArchiveLoader, objectUrls: string[]) {
  const section = book.sections[index];
  if (!section?.createDocument) {
    throw new Error(`Section ${index + 1} is not available.`);
  }

  const doc = await section.createDocument();
  return normalizeSectionDocument(doc, section.href ?? '', loader, objectUrls);
}

function initialSectionIndex(book: BookDoc) {
  const firstTocHref = book.toc?.[0]?.href;
  if (firstTocHref && book.resolveHref) {
    try {
      return book.resolveHref(firstTocHref).index;
    } catch {
      // fall back to the first section
    }
  }
  return 0;
}

function useDebouncedPreferenceSave(preferences: ReaderPreferences, ready: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void setReaderPreferences({
        ...preferences,
        updatedAt: Date.now(),
      });
    }, 250);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [preferences, ready]);
}

function ReaderSettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/6 bg-white/75 px-4 py-3">
      <span className="text-sm font-medium text-[#1d2524]">{label}</span>
      {children}
    </label>
  );
}

function findCurrentSectionIndex(sections: LoadedSection[], refs: React.MutableRefObject<Record<number, HTMLElement | null>>) {
  const threshold = window.scrollY + 120;
  let currentIndex = sections[0]?.index ?? 0;

  for (const section of sections) {
    const node = refs.current[section.index];
    if (!node) continue;
    if (node.offsetTop <= threshold) {
      currentIndex = section.index;
    } else {
      break;
    }
  }

  return currentIndex;
}

export default function ReaderShell({
  file,
  bookId,
  dirKey,
  fileName,
}: {
  file: File;
  bookId: string;
  dirKey: string;
  fileName: string;
}) {
  const [book, setBook] = useState<BookDoc | null>(null);
  const [loadedSections, setLoadedSections] = useState<LoadedSection[]>([]);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [status, setStatus] = useState('Preparing reader…');
  const [preferences, setPreferences] = useState<ReaderPreferences>(createDefaultReaderPreferences());
  const [prefsReady, setPrefsReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookProgress, setBookProgress] = useState<BookProgress | null>(null);
  const [progressReady, setProgressReady] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);
  const loaderRef = useRef<ArchiveLoader | null>(null);
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const restoredScrollRef = useRef(false);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const savedPreferences = await getReaderPreferences();
        if (!active) return;
        if (savedPreferences) {
          setPreferences(savedPreferences);
        }
      } catch {
        // fall back to defaults
      } finally {
        if (active) {
          setPrefsReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useDebouncedPreferenceSave(preferences, prefsReady);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const savedProgress = await loadBookProgress(bookId);
        if (!active) return;
        setBookProgress(savedProgress ?? null);
      } catch {
        if (active) {
          setBookProgress(null);
        }
      } finally {
        if (active) {
          setProgressReady(true);
        }
      }
    })();

    return () => {
      active = false;
      restoredScrollRef.current = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (!progressReady || !bookProgress || restoredScrollRef.current || loadedSections.length === 0) return;

    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        const totalScrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        const targetTop = Math.max(0, Math.min(bookProgress.progressRatio * totalScrollable, totalScrollable));
        window.scrollTo({ top: targetTop, behavior: 'auto' });
        restoredScrollRef.current = true;
      });
    });

    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [bookProgress, loadedSections.length, progressReady]);

  useEffect(() => {
    if (!book) return;

    const saveNow = () => {
      const currentIndex = findCurrentSectionIndex(loadedSections, sectionRefs);
      const totalScrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progressRatio = window.scrollY / totalScrollable;

      void storeBookProgress({
        bookId,
        dirKey,
        fileName,
        title: book.metadata?.title?.trim() || file.name.replace(/\.epub$/i, ''),
        sectionIndex: currentIndex,
        sectionHref: book.sections[currentIndex]?.href,
        inSectionAnchor: undefined,
        scrollTop: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        progressRatio: Math.max(0, Math.min(progressRatio, 1)),
        updatedAt: Date.now(),
      });
    };

    const onScroll = () => {
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
      scrollSaveTimerRef.current = setTimeout(saveNow, 250);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', saveNow);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', saveNow);
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
      saveNow();
    };
  }, [book, bookId, dirKey, file.name, fileName, loadedSections]);

  useEffect(() => {
    return () => {
      for (const objectUrl of objectUrlsRef.current) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setStatus('Loading EPUB data…');
        const [{ EPUB }, zip] = await Promise.all([
          import('foliate-js/epub.js'),
          import('@zip.js/zip.js'),
        ]);
        const { configure, ZipReader, BlobReader, TextWriter, BlobWriter } = zip;
        configure({ useWebWorkers: false });

        setStatus('Reading archive…');
        const reader = new ZipReader(new BlobReader(file));
        const entries = await reader.getEntries();
        const map = new Map(entries.map((entry) => [entry.filename, entry]));
        const loader: ArchiveLoader = {
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
        loaderRef.current = loader;

        setStatus('Parsing EPUB…');
        const parsedBook = (await new EPUB(loader).init()) as BookDoc;
        const startIndex = initialSectionIndex(parsedBook);
        const initialHtml = await loadSectionHtml(parsedBook, startIndex, loader, objectUrlsRef.current);

        if (cancelled) return;

        setBook(parsedBook);
        setLoadedSections([
          {
            index: startIndex,
            html: initialHtml,
            title: sectionTitle(parsedBook, startIndex),
          },
        ]);
        setStatus(`Loaded chapter ${startIndex + 1}/${parsedBook.sections.length}`);
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : 'Failed to open book');
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
      loaderRef.current = null;
    };
  }, [file]);

  const title = useMemo(() => file.name.replace(/\.epub$/i, ''), [file.name]);
  const bookTitle = book?.metadata?.title?.trim() || title;
  const totalSections = book?.sections.length ?? 0;
  const hasMoreSections = loadedSections.length > 0 && loadedSections[loadedSections.length - 1].index + 1 < totalSections;
  const themeColors = resolveReaderThemeColors(preferences.theme);

  const loadNextSection = async () => {
    const loader = loaderRef.current;
    if (!book || !loader) return;

    const lastSection = loadedSections[loadedSections.length - 1];
    if (!lastSection) return;

    const nextIndex = lastSection.index + 1;
    if (nextIndex >= book.sections.length) return;
    if (loadedSections.some((section) => section.index === nextIndex)) return;

    setLoadingIndex(nextIndex);
    setStatus(`Loading chapter ${nextIndex + 1}…`);

    try {
      const html = await loadSectionHtml(book, nextIndex, loader, objectUrlsRef.current);
      const nextSection = {
        index: nextIndex,
        html,
        title: sectionTitle(book, nextIndex),
      } satisfies LoadedSection;

      setLoadedSections((current) => [...current, nextSection].sort((a, b) => a.index - b.index));
      setStatus(`Loaded chapter ${nextIndex + 1}/${book.sections.length}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load chapter');
      console.error(error);
    } finally {
      setLoadingIndex(null);
    }
  };

  const readerStyle = {
    background: themeColors.background,
    color: themeColors.text,
  } as React.CSSProperties;

  return (
    <main className="min-h-screen" style={readerStyle}>
      <div
        className="fixed inset-x-0 top-0 z-30 border-b backdrop-blur"
        style={{ borderColor: themeColors.border, background: `${themeColors.background}e6` }}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4 lg:px-6">
          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.35em]" style={{ color: themeColors.accent }}>
              Local Reader
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm" style={{ color: themeColors.muted }}>
              <Link href="/" className="truncate hover:opacity-80" style={{ color: 'inherit' }}>
                Home
              </Link>
              <span>/</span>
              <Link href="/shelf" className="truncate hover:opacity-80" style={{ color: 'inherit' }}>
                Root shelf
              </Link>
              <span>/</span>
              <span className="truncate font-medium" style={{ color: themeColors.text }}>
                {bookTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <div className="rounded-full border bg-white px-3 py-1 font-medium" style={{ borderColor: themeColors.border, color: themeColors.text }}>
              {loadedSections.length}/{totalSections || '…'} loaded
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="rounded-full border bg-white px-3 py-1 font-medium transition hover:opacity-90"
              style={{ borderColor: themeColors.border, color: themeColors.text }}
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {settingsOpen ? (
        <div
          className="fixed right-4 top-20 z-40 w-[min(92vw,26rem)] rounded-[1.5rem] border bg-white/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur"
          style={{ borderColor: themeColors.border }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em]" style={{ color: themeColors.accent }}>
                Reader settings
              </div>
              <div className="mt-1 text-sm text-[#6b7a78]">Typography and reading mode</div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-full border px-3 py-1 text-sm"
              style={{ borderColor: themeColors.border, color: themeColors.text }}
            >
              Close
            </button>
          </div>

          <div className="space-y-3">
            <ReaderSettingRow label="Theme">
              <div className="flex gap-2">
                {(['light', 'sepia', 'dark'] as const).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setPreferences((current) => ({ ...current, theme }))}
                    className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                    style={{
                      borderColor: preferences.theme === theme ? themeColors.accent : themeColors.border,
                      color: preferences.theme === theme ? themeColors.accent : themeColors.muted,
                      background: preferences.theme === theme ? 'rgba(76,173,169,0.08)' : 'transparent',
                    }}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </ReaderSettingRow>

            <ReaderSettingRow label="Font size">
              <input
                type="range"
                min={15}
                max={24}
                step={1}
                value={preferences.fontSizePx}
                onChange={(event) => setPreferences((current) => ({ ...current, fontSizePx: Number(event.target.value) }))}
              />
            </ReaderSettingRow>

            <ReaderSettingRow label="Line height">
              <input
                type="range"
                min={1.5}
                max={2.4}
                step={0.05}
                value={preferences.lineHeight}
                onChange={(event) => setPreferences((current) => ({ ...current, lineHeight: Number(event.target.value) }))}
              />
            </ReaderSettingRow>

            <ReaderSettingRow label="Paragraph gap">
              <input
                type="range"
                min={0.25}
                max={1.4}
                step={0.05}
                value={preferences.paragraphSpacingEm}
                onChange={(event) => setPreferences((current) => ({ ...current, paragraphSpacingEm: Number(event.target.value) }))}
              />
            </ReaderSettingRow>

            <ReaderSettingRow label="Page width">
              <input
                type="range"
                min={560}
                max={900}
                step={10}
                value={preferences.maxWidthPx}
                onChange={(event) => setPreferences((current) => ({ ...current, maxWidthPx: Number(event.target.value) }))}
              />
            </ReaderSettingRow>

            <ReaderSettingRow label="First line indent">
              <button
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, firstLineIndent: !current.firstLineIndent }))}
                className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                style={{ borderColor: preferences.firstLineIndent ? themeColors.accent : themeColors.border, color: preferences.firstLineIndent ? themeColors.accent : themeColors.muted }}
              >
                {preferences.firstLineIndent ? 'On' : 'Off'}
              </button>
            </ReaderSettingRow>

            <ReaderSettingRow label="Justify text">
              <button
                type="button"
                onClick={() => setPreferences((current) => ({ ...current, justify: !current.justify }))}
                className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                style={{ borderColor: preferences.justify ? themeColors.accent : themeColors.border, color: preferences.justify ? themeColors.accent : themeColors.muted }}
              >
                {preferences.justify ? 'On' : 'Off'}
              </button>
            </ReaderSettingRow>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[1200px] px-4 pt-20 lg:px-6">
        <div className="mb-6 flex items-center justify-between gap-3 text-sm" style={{ color: themeColors.muted }}>
          <div className="min-w-0 truncate">{file.name}</div>
          <div className="shrink-0">{status}</div>
        </div>

        <div className="pb-24">
          {loadedSections.map((section) => (
            <section
              key={section.index}
              ref={(node) => {
                sectionRefs.current[section.index] = node;
              }}
            >
              <div
                className="reader-chapter mx-auto"
                style={{
                  '--reader-max-width': `${preferences.maxWidthPx}px`,
                  '--reader-font-size': `${preferences.fontSizePx}px`,
                  '--reader-line-height': `${preferences.lineHeight}`,
                  '--reader-paragraph-spacing': `${preferences.paragraphSpacingEm}em`,
                  '--reader-first-indent': preferences.firstLineIndent ? '1.8em' : '0',
                  '--reader-text-align': preferences.justify ? 'justify' : 'start',
                  '--reader-foreground': themeColors.text,
                  '--reader-muted': themeColors.muted,
                  '--reader-accent': themeColors.accent,
                  paddingLeft: `${preferences.pagePaddingPx}px`,
                  paddingRight: `${preferences.pagePaddingPx}px`,
                } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </section>
          ))}

          <div className="mx-auto mt-10 w-full max-w-[68rem] px-6">
            {hasMoreSections ? (
              <button
                type="button"
                onClick={() => void loadNextSection()}
                disabled={loadingIndex !== null}
                className="rounded-full border bg-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ borderColor: themeColors.border, color: themeColors.text }}
              >
                {loadingIndex === loadedSections[loadedSections.length - 1]?.index + 1
                  ? 'Loading…'
                  : `Load chapter ${loadedSections[loadedSections.length - 1]?.index + 2}`}
              </button>
            ) : loadedSections.length > 0 ? (
              <div className="text-sm" style={{ color: themeColors.muted }}>
                End of book
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
