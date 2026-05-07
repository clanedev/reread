"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadBookProgress, storeBookProgress } from "@/lib/reader/progress";
import type { BookProgress } from "@/lib/reader/types";
import type { BookDoc } from "../reader-epub";

type FoliateRelocateDetail = {
  index: number;
  fraction: number;
  cfi?: string;
  section?: {
    current: number;
    total: number;
  };
};

export type FoliateNavigationTarget = string | number | { fraction: number };

export function useFoliateReaderProgress({
  book,
  bookId,
  dirKey,
  fileName,
  file,
  enabled,
}: {
  book: BookDoc | null;
  bookId: string;
  dirKey: string;
  fileName: string;
  file: File;
  enabled: boolean;
}) {
  const [bookProgress, setBookProgress] = useState<BookProgress | null>(null);
  const [progressReady, setProgressReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

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
    };
  }, [bookId, enabled]);

  const restoreTargets = useMemo<FoliateNavigationTarget[]>(() => {
    if (!enabled || !bookProgress) {
      return [];
    }

    const targets: FoliateNavigationTarget[] = [];

    if (bookProgress.cfi) {
      targets.push(bookProgress.cfi);
    }

    if (bookProgress.sectionCfi) {
      targets.push(bookProgress.sectionCfi);
    }

    if (typeof bookProgress.locationFraction === "number") {
      targets.push({ fraction: bookProgress.locationFraction });
    }

    if (typeof bookProgress.sectionIndex === "number") {
      targets.push(bookProgress.sectionIndex);
    }

    return targets;
  }, [bookProgress, enabled]);

  const handleRelocate = useCallback(
    async (detail: FoliateRelocateDetail) => {
      if (!enabled) {
        return;
      }

      const sectionIndex = detail.section?.current ?? detail.index;
      const sectionHref = book?.sections[sectionIndex]?.href;
      const sectionCfi = book?.sections[sectionIndex]?.cfi;
      const title = book?.metadata?.title?.trim() || file.name.replace(/\.epub$/i, "");

      await storeBookProgress({
        bookId,
        dirKey,
        fileName,
        title,
        sectionIndex,
        sectionHref,
        sectionCfi,
        cfi: detail.cfi,
        locationFraction: detail.fraction,
        scrollTop: 0,
        scrollHeight: 0,
        progressRatio: detail.fraction,
        updatedAt: Date.now(),
      });
    },
    [book, bookId, dirKey, enabled, file.name, fileName],
  );

  return {
    progressReady,
    restoreTargets,
    handleRelocate,
  };
}
