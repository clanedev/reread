"use client";

import { useEffect, useState } from "react";
import { loadEpubPreview } from "@/lib/reader/cover";
import { getPathKey, isEpubFileName } from "@/lib/shelf/filesystem";
import type { DirectoryEntry, ShelfState } from "@/lib/shelf/types";
import type { ShelfPreviewMap } from "../types";

function getCurrentHandle(state: ShelfState) {
  return state.handles[getPathKey(state.currentPath)];
}

export function useEpubPreviews(state: ShelfState | null, entries: DirectoryEntry[]) {
  const [previews, setPreviews] = useState<ShelfPreviewMap>({});
  const [previewScope, setPreviewScope] = useState("");

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    if (!state) {
      return () => {};
    }

    const pathKey = getPathKey(state.currentPath);
    const epubEntries = entries.filter((entry) => entry.kind === "file" && isEpubFileName(entry.name));

    void (async () => {
      if (!epubEntries.length) {
        if (!cancelled) {
          setPreviewScope(pathKey);
          setPreviews({});
        }
        return;
      }

      const currentHandle = getCurrentHandle(state);
      if (!currentHandle) return;

      const nextPreviews = await Promise.all(
        epubEntries.map(async (entry) => {
          try {
            const fileHandle = await currentHandle.getFileHandle(entry.name);
            const file = await fileHandle.getFile();
            const preview = await loadEpubPreview(file);
            if (cancelled) return null;

            const coverUrl = preview.coverBlob ? URL.createObjectURL(preview.coverBlob) : "";
            if (coverUrl) {
              createdUrls.push(coverUrl);
            }

            return [
              entry.name,
              {
                coverUrl,
                contentKey: preview.contentKey,
                title: preview.title,
                author: preview.author,
              },
            ] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      setPreviewScope(pathKey);
      setPreviews(
        Object.fromEntries(
          nextPreviews.filter(Boolean) as Array<
            readonly [string, { coverUrl: string; contentKey: string; title: string | null; author: string | null }]
          >,
        ),
      );
    })();

    return () => {
      cancelled = true;
      for (const objectUrl of createdUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [state, entries]);

  const currentPathKey = state ? getPathKey(state.currentPath) : "";
  const currentPreviews = state && previewScope === currentPathKey ? previews : null;

  return { currentPreviews };
}
