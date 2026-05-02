'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { setShelfState } from '@/lib/shelf/db';
import type { ShelfState } from '@/lib/shelf/types';

const features = [
  {
    title: 'Local scan',
    description:
      'Choose one folder and the app builds a clean EPUB library from what is already on your device.',
  },
  {
    title: 'Private by default',
    description:
      'Nothing is uploaded. Books, notes, and progress stay on the machine you opened them on.',
  },
  {
    title: 'Reading that remembers',
    description:
      'Pick up where you left off with progress, theme, and typography saved locally.',
  },
];

export default function Home() {
  const router = useRouter();
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState('');

  async function handleDirectory() {
    try {
      setError('');
      setIsPicking(true);
      const rootHandle = await window.showDirectoryPicker();

      const state: ShelfState = {
        currentPath: ['root'],
        handles: {
          root: rootHandle,
        },
      };

      await setShelfState(state);
      router.push('/shelf');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setError('Could not open that folder. Please try again.');
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f6] text-[#1d2524]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between border-b border-black/8 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#4cada9]">Local Reader</p>
            <h1 className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-[#42504d]">
              Local-first EPUB reader
            </h1>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4cada9]/25 bg-[#4cada9]/8 px-4 py-2 text-sm text-[#2d7470]">
              <span className="h-2 w-2 rounded-full bg-[#4cada9]" />
              Private, local, and fast
            </div>

            <h2 className="mt-7 text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Your EPUB library,
              <span className="block text-[#4cada9]">organized on your device.</span>
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5a6664] sm:text-xl">
              Choose a folder, scan your EPUB files, and start reading. Everything stays local, so the app feels simple, calm, and private.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleDirectory}
                disabled={isPicking}
                className="inline-flex items-center justify-center rounded-full bg-[#4cada9] px-6 py-3.5 text-sm font-medium text-white shadow-[0_16px_40px_rgba(76,173,169,0.28)] transition hover:-translate-y-0.5 hover:bg-[#40a097] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPicking ? 'Opening folder…' : 'Choose local folder'}
              </button>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3.5 text-sm font-medium text-[#1d2524] transition hover:border-black/20 hover:bg-[#fbfcfb]"
              >
                See features
              </a>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-[#a04242]">{error}</p>
            ) : null}
          </div>

          <div className="rounded-[1.8rem] border border-black/8 bg-white p-4 shadow-[0_20px_60px_rgba(20,34,33,0.08)]">
            <div className="rounded-[1.4rem] border border-black/6 bg-[#f8fbfb] p-5">
              <div className="flex items-center justify-between border-b border-black/6 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#4cada9]">Library preview</p>
                  <p className="mt-1 text-lg font-medium text-[#1d2524]">Select a folder to begin</p>
                </div>
                <div className="rounded-full bg-[#4cada9] px-3 py-1 text-xs font-medium text-white">
                  EPUB
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ['Nocturne Notes.epub', '1.8 MB'],
                  ['Field Guide to Quiet Places.epub', '9.4 MB'],
                  ['A Study in Paper.epub', '2.6 MB'],
                ].map(([name, size]) => (
                  <div key={name} className="flex items-center justify-between rounded-2xl border border-black/6 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#1d2524]">{name}</p>
                      <p className="text-xs text-[#6c7b79]">Stored locally</p>
                    </div>
                    <span className="text-xs text-[#60706d]">{size}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#eef8f7] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#4cada9]">Theme</p>
                  <p className="mt-2 text-sm leading-6 text-[#4e5c5a]">Light and dark reading modes built for long sessions.</p>
                </div>
                <div className="rounded-2xl bg-[#eef8f7] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#4cada9]">Progress</p>
                  <p className="mt-2 text-sm leading-6 text-[#4e5c5a]">Your last page stays saved on the same device.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-4 border-t border-black/8 py-8 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[1.4rem] border border-black/8 bg-white p-5 shadow-[0_12px_28px_rgba(20,34,33,0.05)]">
              <div className="h-2 w-10 rounded-full bg-[#4cada9]" />
              <h3 className="mt-4 text-lg font-semibold text-[#1d2524]">{feature.title}</h3>
              <p className="mt-2 leading-7 text-[#5f6c6a]">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
