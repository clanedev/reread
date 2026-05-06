"use client";

import { useEffect, useState } from "react";
import { loadBookProgress } from "@/lib/reader/progress";
import { makeBookId } from "@/lib/reader/book-id";
import { getPathKey, isEpubFileName } from "@/lib/shelf/filesystem";
import type { DirectoryEntry, ShelfState } from "@/lib/shelf/types";
import type { ShelfPreviewMap } from "../types";

export function useShelfProgress({
  state,
  entries,
  previews,
}: {
  state: ShelfState | null;
  entries: DirectoryEntry[];
  previews: ShelfPreviewMap | null;
}) {
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [progressScope, setProgressScope] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!state) {
      return () => {};
    }

    const pathKey = getPathKey(state.currentPath);
    const epubEntries = entries.filter((entry) => entry.kind === "file" && isEpubFileName(entry.name));

    void (async () => {
      if (!epubEntries.length || !previews) {
        if (!cancelled) {
          setProgressScope(pathKey);
          setProgressMap({});
        }
        return;
      }

      const nextProgress = await Promise.all(
        epubEntries.map(async (entry) => {
          const preview = previews[entry.name];
          if (!preview) return null;

          try {
            const progress =
              (await loadBookProgress(preview.contentKey)) ??
              (await loadBookProgress(makeBookId(pathKey, entry.name)));

            if (!progress || cancelled) return null;

            return [entry.name, Math.max(0, Math.min(progress.progressRatio * 100, 100))] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      setProgressScope(pathKey);
      setProgressMap(Object.fromEntries(nextProgress.filter(Boolean) as Array<readonly [string, number]>));
    })();

    return () => {
      cancelled = true;
    };
  }, [state, entries, previews]);

  const currentPathKey = state ? getPathKey(state.currentPath) : "";
  const currentProgressMap = state && progressScope === currentPathKey ? progressMap : {};

  return { currentProgressMap };
}
