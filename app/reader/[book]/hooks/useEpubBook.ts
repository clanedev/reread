"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createArchiveLoader, initialSectionIndex, loadSectionHtml, sectionTitle, type ArchiveLoader, type BookDoc, type LoadedSection } from "../reader-epub";

export function useEpubBook(file: File) {
  const [book, setBook] = useState<BookDoc | null>(null);
  const [loadedSections, setLoadedSections] = useState<LoadedSection[]>([]);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [status, setStatus] = useState("Preparing reader…");
  const objectUrlsRef = useRef<string[]>([]);
  const loaderRef = useRef<ArchiveLoader | null>(null);
  const loadedSectionsRef = useRef<LoadedSection[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setStatus("Loading EPUB data…");
        const [{ EPUB }] = await Promise.all([import("foliate-js/epub.js")]);

        setStatus("Reading archive…");
        const loader = await createArchiveLoader(file);
        loaderRef.current = loader;

        setStatus("Parsing EPUB…");
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
        loadedSectionsRef.current = [
          {
            index: startIndex,
            html: initialHtml,
            title: sectionTitle(parsedBook, startIndex),
          },
        ];
        setStatus(`Loaded chapter ${startIndex + 1}/${parsedBook.sections.length}`);
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : "Failed to open book");
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
      loaderRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    loadedSectionsRef.current = loadedSections;
  }, [loadedSections]);

  useEffect(() => {
    return () => {
      for (const objectUrl of objectUrlsRef.current) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrlsRef.current = [];
    };
  }, []);

  const totalSections = book?.sections.length ?? 0;
  const hasMoreSections = loadedSections.length > 0 && loadedSections[loadedSections.length - 1].index + 1 < totalSections;

  const loadSectionAtIndex = useCallback(
    async (nextIndex: number) => {
      const loader = loaderRef.current;
      if (!book || !loader) return false;

      if (nextIndex >= book.sections.length) return false;
      if (loadedSectionsRef.current.some((section) => section.index === nextIndex)) return true;

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
        return true;
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to load chapter");
        console.error(error);
        return false;
      } finally {
        setLoadingIndex(null);
      }
    },
    [book],
  );

  const loadNextSection = useCallback(async () => {
    const lastSection = loadedSectionsRef.current[loadedSectionsRef.current.length - 1];
    if (!lastSection) return;

    await loadSectionAtIndex(lastSection.index + 1);
  }, [loadSectionAtIndex]);

  const loadSectionsThrough = useCallback(
    async (targetIndex: number) => {
      const lastSection = loadedSectionsRef.current[loadedSectionsRef.current.length - 1];
      const currentIndex = lastSection?.index ?? -1;

      if (targetIndex <= currentIndex) {
        return true;
      }

      for (let nextIndex = currentIndex + 1; nextIndex <= targetIndex; nextIndex += 1) {
        const loaded = await loadSectionAtIndex(nextIndex);
        if (!loaded) {
          return false;
        }
      }

      return true;
    },
    [loadSectionAtIndex],
  );

  const title = useMemo(() => file.name.replace(/\.epub$/i, ""), [file.name]);

  return {
    book,
    loadedSections,
    loadingIndex,
    status,
    title,
    totalSections,
    hasMoreSections,
    loadNextSection,
    loadSectionsThrough,
  };
}
