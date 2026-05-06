"use client";

import type { DirectoryEntry } from "@/lib/shelf/types";
import type { ShelfPreviewMap } from "../types";
import { ShelfCard } from "./ShelfCard";

export function ShelfGrid({
  entries,
  currentPathKey,
  previews,
  progressMap,
  onEnterDirectory,
}: {
  entries: DirectoryEntry[];
  currentPathKey: string;
  previews: ShelfPreviewMap | null;
  progressMap: Record<string, number>;
  onEnterDirectory: (name: string) => void;
}) {
  return (
    <section className="shelf-grid">
      {entries.map((entry) => (
        <ShelfCard
          key={`${entry.kind}-${entry.name}`}
          entry={entry}
          currentPathKey={currentPathKey}
          preview={previews?.[entry.name]}
          progressPercent={progressMap[entry.name] ?? 0}
          onEnterDirectory={onEnterDirectory}
        />
      ))}
    </section>
  );
}
