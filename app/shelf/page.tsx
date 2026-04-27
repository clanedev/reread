'use client';

import { useEffect, useMemo, useState } from 'react';
import { clearShelfState, getShelfState, setShelfState } from '../../lib/shelf/db';
import { getPathKey, listDirectoryEntries } from '../../lib/shelf/filesystem';
import type { DirectoryEntry, ShelfState } from '../../lib/shelf/types';

function getCurrentHandle(state: ShelfState) {
  return state.handles[getPathKey(state.currentPath)];
}

export default function ShelfPage() {
  const [state, setState] = useState<ShelfState | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentPathLabel = useMemo(() => state?.currentPath.slice(1).join(' / ') || 'Root', [state]);

  async function loadShelf(nextState: ShelfState | null) {
    if (!nextState) {
      setEntries([]);
      return;
    }

    const currentHandle = getCurrentHandle(nextState);
    if (!currentHandle) {
      throw new Error('Missing directory handle.');
    }

    const permission = await currentHandle.queryPermission({ mode: 'read' });
    const granted =
      permission === 'granted' ||
      (permission === 'prompt' && (await currentHandle.requestPermission({ mode: 'read' })) === 'granted');

    if (!granted) {
      throw new Error('Permission denied.');
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
        setError('Could not load this folder. Please choose it again from the home page.');
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

  async function enterDirectory(name: string) {
    if (!state) return;

    try {
      setError('');
      const currentHandle = getCurrentHandle(state);
      if (!currentHandle) {
        throw new Error('Missing directory handle.');
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
      setError('Could not open that folder.');
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
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between border-b border-black/8 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#4cada9]">Local Reader</p>
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
          <div className="flex flex-col gap-4 rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-[0_12px_28px_rgba(20,34,33,0.05)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#4cada9]">Current path</p>
              <h2 className="mt-2 text-2xl font-semibold">{currentPathLabel}</h2>
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
          <section className="grid gap-3">
            {entries.map((entry) => (
              <button
                key={`${entry.kind}-${entry.name}`}
                onClick={() => entry.kind === 'directory' && void enterDirectory(entry.name)}
                className="flex items-center justify-between rounded-[1.2rem] border border-black/8 bg-white px-5 py-4 text-left transition hover:border-[#4cada9]/35 hover:bg-[#f9fcfb]"
                disabled={entry.kind === 'file'}
              >
                <div>
                  <p className="font-medium text-[#1d2524]">{entry.name}</p>
                  <p className="text-sm text-[#6c7b79]">{entry.kind}</p>
                </div>
                <span className="text-sm text-[#4cada9]">
                  {entry.kind === 'directory' ? 'Open' : 'File'}
                </span>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
