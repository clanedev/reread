"use client";

import { useEffect, useMemo, useState } from "react";
import { parseBook, type BookDoc } from "../reader-epub";

export function useEpubBook(file: File) {
  const [book, setBook] = useState<BookDoc | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { book: parsedBook } = await parseBook(file);
        if (cancelled) return;
        setBook(parsedBook);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const title = useMemo(() => file.name.replace(/\.epub$/i, ""), [file.name]);

  return {
    book,
    title,
  };
}
