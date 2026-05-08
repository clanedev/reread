"use client";

import ReaderShell from "./ReaderShell";
import { useReaderRouteBook } from "./hooks/useReaderRouteBook";

export default function ReaderPage({
  params,
}: {
  params: Promise<{ book: string }>;
}) {
  const book = useReaderRouteBook({ params });

  if (!book) {
    return null;
  }

  return <ReaderShell file={book.file} bookId={book.bookId} dirKey={book.dirKey} fileName={book.fileName} />;
}
