"use client";

import type React from "react";
import { useMemo, useRef, useState } from "react";
import { resolveReaderThemeColors } from "@/lib/reader/theme";
import type { ReaderPreferences } from "@/lib/reader/types";
import { useEpubBook } from "./hooks/useEpubBook";
import { useFoliateReaderProgress } from "./hooks/useFoliateReaderProgress";
import { useReaderPreferences } from "./hooks/useReaderPreferences";
import { useReaderProgress } from "./hooks/useReaderProgress";
import { FoliateReaderView, type FoliateReaderHandle } from "./components/FoliateReaderView";
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
  const foliateViewRef = useRef<FoliateReaderHandle | null>(null);
  const useFoliateRenderer = true;
  const foliateProgress = useFoliateReaderProgress({
    book,
    bookId,
    dirKey,
    fileName,
    file,
    enabled: useFoliateRenderer,
  });
  const foliateReady = !useFoliateRenderer || foliateProgress.progressReady;
  useReaderProgress({
    book,
    bookId,
    dirKey,
    fileName,
    file,
    loadedSections,
    sectionRefs,
    loadSectionsThrough,
    enabled: !useFoliateRenderer,
  });
  const [activePanel, setActivePanel] = useState<ReaderToolPanel | null>(null);

  const bookTitle = book?.metadata?.title?.trim() || title;
  const themeColors = useMemo(
    () => resolveReaderThemeColors(preferences.theme),
    [preferences.theme],
  );

  const tocItems = useMemo(() => {
    if (!book?.toc || !book.resolveHref) {
      return [] as Array<{ label: string; index: number; href: string }>;
    }

    const items: Array<{ label: string; index: number; href: string }> = [];
    const seen = new Set<number>();

    for (const item of book.toc) {
      try {
        const resolved = book.resolveHref(item.href);
        if (seen.has(resolved.index)) continue;
        seen.add(resolved.index);
        items.push({ label: item.label, index: resolved.index, href: item.href });
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
        onTocSelect={async (item) => {
          if (useFoliateRenderer) {
            await foliateViewRef.current?.goTo(item.href);
            return;
          }

          const loaded = await loadSectionsThrough(item.index);
          if (!loaded) return;

          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });

          const node = sectionRefs.current[item.index];
          if (!node) return;

          window.scrollTo({
            top: Math.max(0, node.offsetTop - 96),
            behavior: "smooth",
          });
        }}
        onChange={updatePreferences}
      />

      {useFoliateRenderer ? (
        foliateReady ? (
          <div className="w-full px-4 pt-20 mx-auto bg-white lg:px-6">
            <FoliateReaderView
              ref={foliateViewRef}
              file={file}
              restoreTargets={foliateProgress.restoreTargets}
              themeColors={themeColors}
              onRelocate={foliateProgress.handleRelocate}
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl px-4 pt-20 mx-auto bg-white lg:px-6">
            <div className="rounded-2xl border border-black/6 bg-white/75 px-4 py-3 text-sm text-[#6b7280]">
              Loading reader…
            </div>
          </div>
        )
      ) : (
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
            lastLoadedIndex={loadedSections[loadedSections.length - 1]?.index ?? null}
            onLoadNext={loadNextSection}
            themeColors={themeColors}
          />
        </div>
      )}
    </main>
  );
}
