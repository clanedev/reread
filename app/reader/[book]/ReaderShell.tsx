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
        onPanelChange={setActivePanel}
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
