"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { loadBookProgress, storeBookProgress } from "@/lib/reader/progress";
import type { BookProgress } from "@/lib/reader/types";
import type { BookDoc, LoadedSection } from "../reader-epub";

function findCurrentSectionIndex(
  sections: LoadedSection[],
  refs: React.MutableRefObject<Record<number, HTMLElement | null>>,
) {
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

export function useReaderProgress({
  book,
  bookId,
  dirKey,
  fileName,
  file,
  loadedSections,
  sectionRefs,
}: {
  book: BookDoc | null;
  bookId: string;
  dirKey: string;
  fileName: string;
  file: File;
  loadedSections: LoadedSection[];
  sectionRefs: React.MutableRefObject<Record<number, HTMLElement | null>>;
}) {
  const [bookProgress, setBookProgress] = useState<BookProgress | null>(null);
  const [progressReady, setProgressReady] = useState(false);
  const restoredScrollRef = useRef(false);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        window.scrollTo({ top: targetTop, behavior: "auto" });
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
        title: book.metadata?.title?.trim() || file.name.replace(/\.epub$/i, ""),
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

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("beforeunload", saveNow);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("beforeunload", saveNow);
      if (scrollSaveTimerRef.current) {
        clearTimeout(scrollSaveTimerRef.current);
      }
      saveNow();
    };
  }, [book, bookId, dirKey, file.name, fileName, loadedSections, sectionRefs]);
}
