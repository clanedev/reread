"use client";

// Shelf-level top bar.
export function ShelfHeader({ onResetShelf }: { onResetShelf: () => void }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/8 pb-5">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-[#4cada9]">Local Reader</p>
        <h1 className="mt-2 text-sm font-medium uppercase tracking-[0.22em] text-[#42504d]">
          Shelf
        </h1>
      </div>
      <button
        onClick={() => void onResetShelf()}
        className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#1d2524] transition hover:border-black/20 hover:bg-[#fbfcfb]"
      >
        Clear shelf
      </button>
    </header>
  );
}
