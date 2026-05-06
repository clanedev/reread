"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FolderClosed } from "lucide-react";
import { slugFromFilename } from "@/lib/reader/slug";
import type { DirectoryEntry } from "@/lib/shelf/types";
import type { ShelfPreview } from "../types";

function fileTitle(name: string) {
  return name.replace(/\.(epub|pdf|mobi|azw3|cbz|cbr|txt|html?|xhtml)$/i, "");
}

function EntryBadge({ kind }: { kind: DirectoryEntry["kind"] }) {
  return (
    <span className="shrink-0 rounded-full border border-black/8 bg-[#f7fbfa] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[#4cada9]">
      {kind === "directory" ? "Open" : "EPUB"}
    </span>
  );
}

function CoverPreview({
  title,
  coverUrl,
}: {
  title: string;
  coverUrl?: string;
}) {
  if (coverUrl) {
    return (
      <div className="flex h-full w-full items-end justify-center overflow-hidden bg-[#f6f7f6]">
        <Image
          src={coverUrl}
          alt={title}
          width={220}
          height={300}
          unoptimized
          className="block object-cover w-full h-auto shadow-xl rounded-xs"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#4cada9_0%,#7cd7c3_100%)] text-center text-2xl font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
      {title.slice(0, 2).toUpperCase() || "BK"}
    </div>
  );
}

function MoreMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full z-20 mt-2 min-w-40 rounded-xl border border-black/8 bg-white p-2 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
      <button
        type="button"
        onClick={onClose}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#1d2524] hover:bg-[#f3f5f7]"
      >
        加入收藏
      </button>
      <button
        type="button"
        onClick={onClose}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#1d2524] hover:bg-[#f3f5f7]"
      >
        标记完成
      </button>
    </div>
  );
}

export function ShelfCard({
  entry,
  currentPathKey,
  preview,
  progressPercent = 0,
  onEnterDirectory,
}: {
  entry: DirectoryEntry;
  currentPathKey: string;
  preview?: ShelfPreview;
  progressPercent?: number;
  onEnterDirectory: (name: string) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (moreMenuRef.current?.contains(target)) {
        return;
      }

      setMoreOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [moreOpen]);

  if (entry.kind === "directory") {
    return (
      <button
        key={`${entry.kind}-${entry.name}`}
        onClick={() => void onEnterDirectory(entry.name)}
        className="group flex h-full flex-col rounded-sm bg-white text-left shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition hover:scale-[1.02] cursor-pointer"
      >
        <div className="flex aspect-[11/15] items-center justify-center rounded-sm bg-[linear-gradient(180deg,#eef4f2_0%,#f8fbfa_100%)] p-5">
          <div className="flex h-full w-full flex-col justify-end rounded-[10px] ">
            <div className="w-full">
              <FolderClosed className="w-full h-auto" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-[0.95rem] font-medium text-[#1d2524]">
              {entry.name}
            </p>
          </div>
        </div>
      </button>
    );
  }

  // EPUB card.
  const title = preview?.title ?? fileTitle(entry.name);
  const progressLabel = `${Math.round(progressPercent)}%`;

  return (
    <article className="group relative flex h-full flex-col rounded-xl transition-transform duration-200 hover:scale-[1.02]">
      <Link
        href={{
          pathname: `/reader/${slugFromFilename(entry.name)}`,
          query: {
            name: entry.name,
            dir: currentPathKey,
          },
        }}
        aria-label={`Open ${title}`}
        className="absolute inset-0 z-10 rounded-xs"
      />

      <div className="relative z-0 flex flex-col flex-1 min-h-0">
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-xs ">
          <CoverPreview title={title} coverUrl={preview?.coverUrl} />
        </div>

        <div className="flex items-center justify-between gap-3 px-1 my-2">
          <div className="flex items-center min-w-0 gap-2">
            {progressPercent === 0 ? (
              <span className="rounded-full bg-[#1E40AF] px-2.5 py-1 text-[12px] font-medium uppercase tracking-[0.16em] text-white">
                NEW
              </span>
            ) : null}
            <span className="text-[14px] text-[#6B7280]">{progressLabel}</span>
          </div>

          <div ref={moreMenuRef} className="relative z-20">
            <button
              type="button"
              aria-label="More actions"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMoreOpen((current) => !current);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
            >
              <span className="text-lg leading-none">⋯</span>
            </button>
            {moreOpen ? <MoreMenu onClose={() => setMoreOpen(false)} /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
