"use client";

export function ReaderStatus({
  fileName,
  status,
  themeColors,
}: {
  fileName: string;
  status: string;
  themeColors: { muted: string };
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 text-sm" style={{ color: themeColors.muted }}>
      <div className="min-w-0 truncate">{fileName}</div>
      <div className="shrink-0">{status}</div>
    </div>
  );
}
