"use client";

import { useEpubPreviews } from "./hooks/useEpubPreviews";
import { useShelf } from "./hooks/useShelf";
import { useShelfProgress } from "./hooks/useShelfProgress";
import { ShelfBreadcrumb } from "./components/ShelfBreadcrumb";
import { ShelfContent } from "./components/ShelfContent";
import { ShelfGrid } from "./components/ShelfGrid";
import { ShelfHeader } from "./components/ShelfHeader";

export default function ShelfPage() {
  const shelf = useShelf();
  const { currentPreviews } = useEpubPreviews(shelf.state, shelf.entries);
  const { currentProgressMap } = useShelfProgress({
    state: shelf.state,
    entries: shelf.entries,
    previews: currentPreviews,
  });

  return (
    <>
      <ShelfHeader onResetShelf={shelf.resetShelf} />

      <ShelfBreadcrumb
        currentPathLabel={shelf.currentPathLabel}
        canGoUp={shelf.canGoUp}
        onGoUp={shelf.goUp}
      />

      <ShelfContent loading={shelf.loading} error={shelf.error} hasShelf={Boolean(shelf.state)}>
        <ShelfGrid
          entries={shelf.entries}
          currentPathKey={shelf.currentPathKey}
          previews={currentPreviews}
          progressMap={currentProgressMap}
          onEnterDirectory={shelf.enterDirectory}
        />
      </ShelfContent>
    </>
  );
}
