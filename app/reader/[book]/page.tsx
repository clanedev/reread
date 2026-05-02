"use client";

import React, { useEffect, useState } from "react";
import { loadEpubPreview } from "@/lib/reader/cover";
import { getShelfState } from "@/lib/shelf/db";
import { isEpubFileName } from "@/lib/shelf/filesystem";
import type { ShelfState } from "@/lib/shelf/types";
import { isSlugMatchFilename } from "@/lib/reader/slug";
import ReaderShell from "./ReaderShell";

function getCurrentHandle(state: ShelfState, dirKey: string) {
  return state.handles[dirKey];
}

export default function ReaderPage({
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

        const [{ book: bookSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
        const fileName = resolvedSearchParams.name ?? "";
        const dirKey = resolvedSearchParams.dir ?? "root";

        if (!fileName || !dirKey) {
          throw new Error("Missing book reference.");
        }

        if (!isEpubFileName(fileName) || !isSlugMatchFilename(bookSlug, fileName)) {
          throw new Error("Invalid book link.");
        }

        const state = await getShelfState();
        if (!state) {
          throw new Error("No shelf is available.");
        }

        const handle = getCurrentHandle(state, dirKey);
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

        const fileHandle = await handle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const preview = await loadEpubPreview(file);

        if (!active) return;

        setBook({ file, dirKey, fileName, bookId: preview.contentKey });
      } catch {
        return;
      }
    })();

    return () => {
      active = false;
    };
  }, [params, searchParams]);

  if (!book) {
    return null;
  }

  return <ReaderShell file={book.file} bookId={book.bookId} dirKey={book.dirKey} fileName={book.fileName} />;
}
