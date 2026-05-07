"use client";

import { useEffect, useRef } from "react";

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
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMoreSections || loadingIndex !== null) {
      return;
    }

    const element = loaderRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadNext();
        }
      },
      {
        rootMargin: "600px 0px",
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreSections, loadingIndex, onLoadNext]);

  return (
    <div ref={loaderRef} className="mx-auto mt-10 w-full max-w-[68rem] px-6">
      {hasMoreSections ? (
        <div
          className="rounded-full border bg-white px-5 py-2.5 text-sm font-medium shadow-sm"
          style={{ borderColor: themeColors.border, color: themeColors.text }}
        >
          {loadingIndex === (lastLoadedIndex ?? -1) + 1 ? "Loading…" : "Loading next chapter…"}
        </div>
      ) : lastLoadedIndex !== null ? (
        <div className="text-sm" style={{ color: themeColors.muted }}>
          End of book
        </div>
      ) : null}
    </div>
  );
}
