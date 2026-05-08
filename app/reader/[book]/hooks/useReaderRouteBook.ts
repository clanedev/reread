"use client";

import { useEffect, useState } from "react";
import { loadEpubPreview } from "@/lib/reader/cover";
import { getShelfState, getEpubBookRecord } from "@/lib/shelf/db";

export function useReaderRouteBook({
  params,
}: {
  params: Promise<{ book: string }>;
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

        const { book: routeBook } = await params;
        const state = await getShelfState();
        if (!state) {
          throw new Error("No shelf is available.");
        }

        const bookId = decodeURIComponent(routeBook);
        const record = await getEpubBookRecord(bookId);
        if (!record?.dirKey || !record.fileName) {
          throw new Error("Book location not found.");
        }

        const handle = state.handles[record.dirKey];
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

        const fileHandle = await handle.getFileHandle(record.fileName);
        const file = await fileHandle.getFile();
        const preview = await loadEpubPreview(file);

        if (!active) return;
        if (preview.contentKey !== bookId) {
          throw new Error("Book location mismatch.");
        }

        setBook({ file, dirKey: record.dirKey, fileName: record.fileName, bookId: preview.contentKey });
      } catch {
        if (active) {
          setBook(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [params]);

  return book;
}
