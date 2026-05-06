"use client";

import ReaderShell from "./ReaderShell";
import { useReaderRouteBook } from "./hooks/useReaderRouteBook";

export default function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ book: string }>;
  searchParams: Promise<{ name?: string; dir?: string }>;
}) {
  const book = useReaderRouteBook({ params, searchParams });

  if (!book) {
    return null;
  }

  return <ReaderShell file={book.file} bookId={book.bookId} dirKey={book.dirKey} fileName={book.fileName} />;
}
