"use client";

export function LoadNextSectionButton({
  hasMoreSections,
  loadingIndex,
  lastLoadedIndex,
  onLoadNext,
  themeColors,
}: {
  hasMoreSections: boolean;
  loadingIndex: number | null;
  lastLoadedIndex: number | null;
  onLoadNext: () => void;
  themeColors: { border: string; text: string; muted: string };
}) {
  return (
    <div className="mx-auto mt-10 w-full max-w-[68rem] px-6">
      {hasMoreSections ? (
        <button
          type="button"
          onClick={() => void onLoadNext()}
          disabled={loadingIndex !== null}
          className="rounded-full border bg-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ borderColor: themeColors.border, color: themeColors.text }}
        >
          {loadingIndex === (lastLoadedIndex ?? -1) + 1 ? 'Loading…' : `Load chapter ${(lastLoadedIndex ?? -1) + 2}`}
        </button>
      ) : lastLoadedIndex !== null ? (
        <div className="text-sm" style={{ color: themeColors.muted }}>
          End of book
        </div>
      ) : null}
    </div>
  );
}
