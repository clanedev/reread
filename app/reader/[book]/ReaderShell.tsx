"use client";

import type React from "react";
import { useMemo, useRef, useState } from "react";
import { resolveReaderThemeColors } from "@/lib/reader/theme";
import type { ReaderPreferences } from "@/lib/reader/types";
import { useEpubBook } from "./hooks/useEpubBook";
import { useReaderPreferences } from "./hooks/useReaderPreferences";
import { useReaderProgress } from "./hooks/useReaderProgress";
import { LoadNextSectionButton } from "./components/LoadNextSectionButton";
import { ReaderChapterList } from "./components/ReaderChapterList";
import { ReaderHeader } from "./components/ReaderHeader";
import { ReaderSettingsPanel, type ReaderToolPanel } from "./components/ReaderSettingsPanel";

export default function ReaderShell({
  file,
  bookId,
  dirKey,
  fileName,
}: {
  file: File;
  bookId: string;
  dirKey: string;
  fileName: string;
}) {
  const { preferences, setPreferences } = useReaderPreferences();
  const {
    book,
    loadedSections,
    loadingIndex,
    title,
    totalSections,
    hasMoreSections,
    loadNextSection,
    loadSectionsThrough,
  } = useEpubBook(file);
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});
  useReaderProgress({
    book,
    bookId,
    dirKey,
    fileName,
    file,
    loadedSections,
    sectionRefs,
  });
  const [activePanel, setActivePanel] = useState<ReaderToolPanel | null>(null);

  const bookTitle = book?.metadata?.title?.trim() || title;
  const themeColors = useMemo(
    () => resolveReaderThemeColors(preferences.theme),
    [preferences.theme],
  );

  const tocItems = useMemo(() => {
    if (!book?.toc || !book.resolveHref) {
      return [] as Array<{ label: string; index: number }>;
    }

    const items: Array<{ label: string; index: number }> = [];
    const seen = new Set<number>();

    for (const item of book.toc) {
      try {
        const index = book.resolveHref(item.href).index;
        if (seen.has(index)) continue;
        seen.add(index);
        items.push({ label: item.label, index });
      } catch {
        continue;
      }
    }

    return items;
  }, [book]);

  const readerStyle = {
    background: themeColors.background,
    color: themeColors.text,
  } as React.CSSProperties;

  const updatePreferences = (
    updater: (current: ReaderPreferences) => ReaderPreferences,
  ) => {
    setPreferences(updater);
  };

  return (
    <main className="min-h-screen bg-gray-100" style={readerStyle}>
      <ReaderHeader
        bookTitle={bookTitle}
        loadedCount={loadedSections.length}
        totalSections={totalSections}
        themeColors={themeColors}
      />

      <ReaderSettingsPanel
        activePanel={activePanel}
        preferences={preferences}
        themeColors={themeColors}
        tocItems={tocItems}
        onPanelChange={setActivePanel}
        onTocSelect={async (index) => {
          const loaded = await loadSectionsThrough(index);
          if (!loaded) return;

          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });

          const node = sectionRefs.current[index];
          if (!node) return;

          window.scrollTo({
            top: Math.max(0, node.offsetTop - 96),
            behavior: "smooth",
          });
        }}
        onChange={updatePreferences}
      />

      <div className="w-full max-w-4xl px-4 pt-20 mx-auto bg-white lg:px-6">
        <ReaderChapterList
          sections={loadedSections}
          preferences={preferences}
          themeColors={themeColors}
          sectionRefs={sectionRefs}
        />

        <LoadNextSectionButton
          hasMoreSections={hasMoreSections}
          loadingIndex={loadingIndex}
          lastLoadedIndex={
            loadedSections[loadedSections.length - 1]?.index ?? null
          }
          onLoadNext={loadNextSection}
          themeColors={themeColors}
        />
      </div>
    </main>
  );
}
