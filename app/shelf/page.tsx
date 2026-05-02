"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearShelfState, getShelfState, setShelfState } from "@/lib/shelf/db";
import { loadEpubPreview } from "@/lib/reader/cover";
import { makeBookId } from "@/lib/reader/book-id";
import { loadBookProgress } from "@/lib/reader/progress";
import {
  getPathKey,
  isEpubFileName,
  listDirectoryEntries,
} from "@/lib/shelf/filesystem";
import { slugFromFilename } from "@/lib/reader/slug";
import type { DirectoryEntry, ShelfState } from "@/lib/shelf/types";

function getCurrentHandle(state: ShelfState) {
  return state.handles[getPathKey(state.currentPath)];
}

function fileTitle(name: string) {
  return name.replace(/\.(epub|pdf|mobi|azw3|cbz|cbr|txt|html?|xhtml)$/i, "");
}

export default function ShelfPage() {
  const [state, setState] = useState<ShelfState | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [previews, setPreviews] = useState<
    Record<
      string,
      { coverUrl: string; contentKey: string; title: string | null; author: string | null }
    >
  >({});
  const [previewScope, setPreviewScope] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [progressScope, setProgressScope] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentPathLabel = useMemo(
    () => state?.currentPath.slice(1).join(" / ") || "Root",
    [state],
  );

  const currentPathKey = getPathKey(state?.currentPath ?? []);
  const currentPreviews = previewScope === currentPathKey ? previews : null;
  const currentProgressMap = progressScope === currentPathKey ? progressMap : {};

  async function loadShelf(nextState: ShelfState | null) {
    if (!nextState) {
      setEntries([]);
      return;
    }

    const currentHandle = getCurrentHandle(nextState);
    if (!currentHandle) {
      throw new Error("Missing directory handle.");
    }

    const permission = await currentHandle.queryPermission({ mode: "read" });
    const granted =
      permission === "granted" ||
      (permission === "prompt" && (await currentHandle.requestPermission({ mode: "read" })) === "granted");

    if (!granted) {
      throw new Error("Permission denied.");
    }

    const nextEntries = await listDirectoryEntries(currentHandle);
    setEntries(nextEntries);
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const savedState = await getShelfState();
        if (!active) return;

        if (!savedState) {
          setState(null);
          setEntries([]);
          setLoading(false);
          return;
        }

        setState(savedState);
        await loadShelf(savedState);
      } catch {
        if (!active) return;
        setError(
          "Could not load this folder. Please choose it again from the home page.",
        );
        setEntries([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    if (!state) {
      return () => {};
    }

    const epubEntries = entries.filter(
      (entry) => entry.kind === "file" && isEpubFileName(entry.name),
    );
    const pathKey = getPathKey(state.currentPath);

    void (async () => {
      if (!epubEntries.length) {
        if (!cancelled) {
          setPreviewScope(pathKey);
          setPreviews({});
        }
        return;
      }

      const currentHandle = getCurrentHandle(state);
      if (!currentHandle) return;

      const nextPreviews = await Promise.all(
        epubEntries.map(async (entry) => {
          try {
            const fileHandle = await currentHandle.getFileHandle(entry.name);
            const file = await fileHandle.getFile();
            const preview = await loadEpubPreview(file);
            if (cancelled) return null;

            const coverUrl = preview.coverBlob
              ? URL.createObjectURL(preview.coverBlob)
              : "";
            if (coverUrl) {
              createdUrls.push(coverUrl);
            }

            return [
              entry.name,
              {
                coverUrl,
                contentKey: preview.contentKey,
                title: preview.title,
                author: preview.author,
              },
            ] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      setPreviewScope(pathKey);
      setPreviews(
        Object.fromEntries(
          nextPreviews.filter(Boolean) as Array<
            readonly [
              string,
              { coverUrl: string; title: string | null; author: string | null },
            ]
          >,
        ),
      );
    })();

    return () => {
      cancelled = true;
      for (const objectUrl of createdUrls) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [state, entries]);

  useEffect(() => {
    let cancelled = false;

    if (!state) {
      return () => {};
    }

    const epubEntries = entries.filter(
      (entry) => entry.kind === "file" && isEpubFileName(entry.name),
    );
    const pathKey = getPathKey(state.currentPath);

    void (async () => {
      if (!epubEntries.length) {
        if (!cancelled) {
          setProgressScope(pathKey);
          setProgressMap({});
        }
        return;
      }

      const nextProgress = await Promise.all(
        epubEntries.map(async (entry) => {
          const preview = currentPreviews?.[entry.name];
          if (!preview) return null;

          try {
            const progress =
              (await loadBookProgress(preview.contentKey)) ??
              (await loadBookProgress(makeBookId(pathKey, entry.name)));
            if (!progress || cancelled) return null;
            return [
              entry.name,
              Math.max(0, Math.min(progress.progressRatio * 100, 100)),
            ] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) return;

      setProgressScope(pathKey);
      setProgressMap(
        Object.fromEntries(
          nextProgress.filter(Boolean) as Array<readonly [string, number]>,
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [state, entries, currentPreviews]);

  async function enterDirectory(name: string) {
    if (!state) return;

    try {
      setError("");
      const currentHandle = getCurrentHandle(state);
      if (!currentHandle) {
        throw new Error("Missing directory handle.");
      }

      const childHandle = await currentHandle.getDirectoryHandle(name);
      const nextPath = [...state.currentPath, name];
      const nextState: ShelfState = {
        currentPath: nextPath,
        handles: {
          ...state.handles,
          [getPathKey(nextPath)]: childHandle,
        },
      };

      await setShelfState(nextState);
      setState(nextState);
      await loadShelf(nextState);
    } catch {
      setError("Could not open that folder.");
    }
  }

  async function goUp() {
    if (!state || state.currentPath.length <= 1) return;

    const nextPath = state.currentPath.slice(0, -1);
    const nextState: ShelfState = {
      ...state,
      currentPath: nextPath,
    };

    await setShelfState(nextState);
    setState(nextState);
    await loadShelf(nextState);
  }

  async function resetShelf() {
    await clearShelfState();
    setState(null);
    setEntries([]);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f6] text-[#1d2524]">
      <div className="flex flex-col w-full min-h-screen px-5 py-5 mx-auto max-w-7xl lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-black/8">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#4cada9]">
              Local Reader
            </p>
            <h1 className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-[#42504d]">
              Shelf
            </h1>
          </div>
          <button
            onClick={resetShelf}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#1d2524] transition hover:border-black/20 hover:bg-[#fbfcfb]"
          >
            Clear shelf
          </button>
        </header>

        <section className="py-8">
          <div className="flex flex-col gap-4 rounded-[1.8rem] border border-black/8 bg-white/90 p-5 shadow-[0_16px_34px_rgba(20,34,33,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#4cada9]">
                Current path
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {currentPathLabel}
              </h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={goUp}
                disabled={!state || state.currentPath.length <= 1}
                className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#1d2524] transition hover:border-black/20 hover:bg-[#fbfcfb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Up one level
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[1.4rem] border border-black/8 bg-white p-5 text-[#5f6c6a]">
            Loading shelf…
          </div>
        ) : error ? (
          <div className="rounded-[1.4rem] border border-[#f0b4b4] bg-[#fff7f7] p-5 text-[#a04242]">
            {error}
          </div>
        ) : !state ? (
          <div className="rounded-[1.4rem] border border-black/8 bg-white p-5 text-[#5f6c6a]">
            No shelf is selected. Go back to the home page and choose a folder.
          </div>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {entries.map((entry) => {
              const fallbackTitle = fileTitle(entry.name);
              const entryPreview = currentPreviews?.[entry.name];
              const title = entryPreview?.title ?? fallbackTitle;

              if (entry.kind === "directory") {
                return (
                  <button
                    key={`${entry.kind}-${entry.name}`}
                    onClick={() => void enterDirectory(entry.name)}
                    className="group flex h-full flex-col overflow-hidden rounded-[1.9rem] border border-black/8 bg-white text-left shadow-[0_16px_40px_rgba(20,34,33,0.05)] transition hover:-translate-y-0.5 hover:border-[#4cada9]/35 hover:shadow-[0_20px_50px_rgba(20,34,33,0.09)]"
                  >
                    <div className="flex aspect-[4/5] items-center justify-center bg-[linear-gradient(180deg,#eef4f2_0%,#f8fbfa_100%)] p-5">
                      <div className="flex h-full w-full flex-col justify-between rounded-[1.6rem] border border-black/6 bg-[#fbfdfc] p-4">
                        <div className="flex items-start justify-between text-[#4cada9]">
                          <span className="text-xs uppercase tracking-[0.28em]">
                            Folder
                          </span>
                          <span className="text-2xl leading-none">▣</span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-4xl leading-none text-[#bcc9c6]">
                            ▦
                          </div>
                          <div className="rounded-full border border-black/6 bg-white px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#6c7b79]">
                            {entry.name}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[0.95rem] font-medium text-[#1d2524]">
                          {entry.name}
                        </p>
                        <p className="text-sm text-[#6c7b79]">Directory</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-black/8 bg-[#f7fbfa] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[#4cada9]">
                        Open
                      </span>
                    </div>
                  </button>
                );
              }

              if (!isEpubFileName(entry.name)) {
                return (
                  <div
                    key={`${entry.kind}-${entry.name}`}
                    className="flex h-full flex-col overflow-hidden rounded-[1.9rem] border border-black/8 bg-white opacity-70"
                  >
                    <div className="flex aspect-[4/5] items-center justify-center bg-[linear-gradient(180deg,#f0f2f2_0%,#fbfcfb_100%)] p-5 text-[#9ea9a7]">
                      <div className="flex h-full w-full flex-col justify-between rounded-[1.6rem] border border-dashed border-black/10 bg-white p-4">
                        <div className="flex items-start justify-between text-[#6c7b79]">
                          <span className="text-xs uppercase tracking-[0.28em]">
                            File
                          </span>
                          <span className="text-2xl leading-none">—</span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-4xl leading-none text-[#d0d6d5]">
                            ▧
                          </div>
                          <div className="rounded-full border border-black/6 bg-[#f8faf9] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#7f8a88]">
                            Unsupported
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-4">
                      <p className="truncate text-[0.95rem] font-medium text-[#1d2524]">
                        {entry.name}
                      </p>
                      <p className="text-sm text-[#6c7b79]">File</p>
                    </div>
                  </div>
                );
              }

              const slug = slugFromFilename(entry.name);

              return (
                <Link
                  key={`${entry.kind}-${entry.name}`}
                  href={{
                    pathname: `/reader/${slug}`,
                    query: {
                      name: entry.name,
                      dir: getPathKey(state.currentPath),
                    },
                  }}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.9rem] border border-black/8 bg-white shadow-[0_16px_40px_rgba(20,34,33,0.05)] transition hover:-translate-y-0.5 hover:border-[#4cada9]/35 hover:shadow-[0_20px_50px_rgba(20,34,33,0.09)]"
                >
                  <div className="flex aspect-[4/5] items-center justify-center bg-[linear-gradient(180deg,#eef4f2_0%,#f8fbfa_100%)] p-5">
                    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f6faf9_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]">
                      <div className="flex items-start justify-between px-4 pt-4">
                        <span className="text-xs uppercase tracking-[0.28em] text-[#4cada9]">
                          Book
                        </span>
                        <span className="text-xs uppercase tracking-[0.24em] text-[#6c7b79]">
                          EPUB
                        </span>
                      </div>
                      <div className="relative mx-4 mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-[1rem] border border-black/6 bg-[#eff4f2]">
                        {entryPreview?.coverUrl ? (
                          <Image
                            src={entryPreview.coverUrl}
                            alt={title}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#4cada9_0%,#7cd7c3_100%)] text-center text-sm font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(76,173,169,0.24)]">
                            {title.slice(0, 2).toUpperCase() || "BK"}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-4 text-center">
                        <p className="line-clamp-2 text-[0.96rem] font-medium text-[#1d2524]">
                          {title}
                        </p>
                        <p className="mt-2 line-clamp-1 text-xs uppercase tracking-[0.24em] text-[#6c7b79]">
                          {entryPreview?.author ?? "Unknown author"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[0.95rem] font-medium text-[#1d2524]">
                          {title}
                        </p>
                        <p className="text-sm text-[#6c7b79]">
                          EPUB
                          {entryPreview?.author
                            ? ` · ${entryPreview.author}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-black/8 bg-[#f7fbfa] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[#4cada9] transition group-hover:bg-[#4cada9] group-hover:text-white">
                        Read
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-[#4cada9] transition-all"
                          style={{
                            width: `${currentProgressMap[entry.name] ?? 0}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[#6c7b79]">
                        <span>
                          {currentProgressMap[entry.name]
                            ? "Continue reading"
                            : "New book"}
                        </span>
                        <span>
                          {Math.round(currentProgressMap[entry.name] ?? 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
