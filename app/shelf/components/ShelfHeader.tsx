"use client";

// Shelf-level top bar.
export function ShelfHeader({ onResetShelf }: { onResetShelf: () => void }) {
  return (
    <header className="top-0 z-20 flex flex-wrap items-center justify-between gap-4 py-2 border-b  border-black/8">
      <div>
        {/*  */}
        <p className="text-xl tracking-[0.35em] text-[#4cada9]">Local Reader</p>
      </div>
      <button className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#1d2524] transition cursor-pointer">
        Login
      </button>
    </header>
  );
}
