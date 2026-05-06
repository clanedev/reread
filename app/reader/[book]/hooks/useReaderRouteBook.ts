"use client";

import { useEffect, useState } from "react";
import { loadEpubPreview } from "@/lib/reader/cover";
import { getShelfState, getEpubBookLocationRecord } from "@/lib/shelf/db";
import { isEpubFileName } from "@/lib/shelf/filesystem";
import { isSlugMatchFilename } from "@/lib/reader/slug";

export function useReaderRouteBook({
  params,
  searchParams,
}: {
  params: Promise<{ book: string }>;
  searchParams: Promise<{ name?: string; dir?: string }>;
}) {
  const [book, setBook] = useState<{
    file: File;
    dirKey: string;
    fileName: string;
    bookId: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setBook(null);

        const [{ book: routeBook }, resolvedSearchParams] = await Promise.all([params, searchParams]);
        const legacyFileName = resolvedSearchParams.name ?? "";
        const legacyDirKey = resolvedSearchParams.dir ?? "";
        const hasLegacyQuery = Boolean(legacyFileName && legacyDirKey);

        const state = await getShelfState();
        if (!state) {
          throw new Error("No shelf is available.");
        }

        let fileName = legacyFileName;
        let dirKey = legacyDirKey;
        const bookId = decodeURIComponent(routeBook);

        if (hasLegacyQuery) {
          if (!isEpubFileName(legacyFileName) || !isSlugMatchFilename(routeBook, legacyFileName)) {
            throw new Error("Invalid book link.");
          }

          const handle = state.handles[legacyDirKey];
          if (!handle) {
            throw new Error("Folder not found.");
          }

          const permission = await handle.queryPermission({ mode: "read" });
          const granted =
            permission === "granted" ||
            (permission === "prompt" && (await handle.requestPermission({ mode: "read" })) === "granted");

          if (!granted) {
            throw new Error("Permission denied.");
          }

          const fileHandle = await handle.getFileHandle(legacyFileName);
          const file = await fileHandle.getFile();
          const preview = await loadEpubPreview(file);

          if (!active) return;

          setBook({ file, dirKey: legacyDirKey, fileName: legacyFileName, bookId: preview.contentKey });
          return;
        }

        const location = await getEpubBookLocationRecord(bookId);
        if (!location) {
          throw new Error("Book location not found.");
        }

        fileName = location.fileName;
        dirKey = location.dirKey;

        const handle = state.handles[location.dirKey];
        if (!handle) {
          throw new Error("Folder not found.");
        }

        const permission = await handle.queryPermission({ mode: "read" });
        const granted =
          permission === "granted" ||
          (permission === "prompt" && (await handle.requestPermission({ mode: "read" })) === "granted");

        if (!granted) {
          throw new Error("Permission denied.");
        }

        const fileHandle = await handle.getFileHandle(location.fileName);
        const file = await fileHandle.getFile();
        const preview = await loadEpubPreview(file);

        if (!active) return;
        if (preview.contentKey !== bookId) {
          throw new Error("Book location mismatch.");
        }

        setBook({ file, dirKey, fileName, bookId: preview.contentKey });
      } catch {
        if (active) {
          setBook(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [params, searchParams]);

  return book;
}
