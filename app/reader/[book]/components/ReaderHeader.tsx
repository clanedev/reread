"use client";

import Link from "next/link";

export function ReaderHeader({
  bookTitle,
  loadedCount,
  totalSections,
  themeColors,
  onToggleSettings,
}: {
  bookTitle: string;
  loadedCount: number;
  totalSections: number;
  themeColors: {
    background: string;
    border: string;
    accent: string;
    muted: string;
    text: string;
  };
  onToggleSettings: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 border-b backdrop-blur"
      style={{
        borderColor: themeColors.border,
        background: `${themeColors.background}e6`,
      }}
    >
      <div className="flex items-center justify-between w-full h-16 max-w-6xl gap-3 px-4 mx-auto lg:px-6">
        <div
          className="flex items-center text-sm w-xs text-ellipsis"
          style={{ color: themeColors.muted }}
        >
          <span
            className="font-medium truncate"
            style={{ color: themeColors.text }}
          >
            {bookTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onToggleSettings}
            className="px-3 py-1 font-medium transition bg-white border rounded-full hover:opacity-90"
            style={{ borderColor: themeColors.border, color: themeColors.text }}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
