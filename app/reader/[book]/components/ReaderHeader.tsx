"use client";

import Link from "next/link";

export function ReaderHeader({
  bookTitle,
  themeColors,
}: {
  bookTitle: string;
  themeColors: {
    background: string;
    border: string;
    accent: string;
    muted: string;
    text: string;
  };
}) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 max-w-4xl mx-auto border-b backdrop-blur"
      style={{
        borderColor: themeColors.border,
        background: `${themeColors.background}e6`,
      }}
    >
      <div className="flex items-center justify-between w-full h-16 max-w-6xl gap-3 px-4 mx-auto lg:px-6">
        <div className="flex items-center text-sm w-xs text-ellipsis" style={{ color: themeColors.muted }}>
          <span className="font-medium truncate" style={{ color: themeColors.text }}>
            {bookTitle}
          </span>
        </div>
        <div>
          <Link href="/shelf">
            <button className="hover:underline">My Shelf</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
