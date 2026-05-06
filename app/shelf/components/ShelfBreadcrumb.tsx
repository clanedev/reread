"use client";

// Current shelf path and navigation control.
export function ShelfBreadcrumb({
  currentPathLabel,
  canGoUp,
  onGoUp,
}: {
  currentPathLabel: string;
  canGoUp: boolean;
  onGoUp: () => void;
}) {
  return (
    <section className="py-8">
      <div className="flex flex-col gap-4 rounded-[1.8rem] border border-black/8 bg-white/90 p-5 shadow-[0_16px_34px_rgba(20,34,33,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#4cada9]">Current path</p>
          <h2 className="mt-2 text-2xl font-semibold">{currentPathLabel}</h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => void onGoUp()}
            disabled={!canGoUp}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-[#1d2524] transition hover:border-black/20 hover:bg-[#fbfcfb] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Up one level
          </button>
        </div>
      </div>
    </section>
  );
}
