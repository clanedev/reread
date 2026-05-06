"use client";

import { ChevronRight, House } from "lucide-react";

export function ShelfBreadcrumb({
  currentPath,
  onGoToPath,
}: {
  currentPath: string[];
  onGoToPath: (path: string[]) => void;
}) {
  const segments = currentPath.slice(1);

  return (
    <section className="py-8">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#6c7b79]">
          <li className="flex items-center min-w-0 gap-2">
            <button
              type="button"
              onClick={() => onGoToPath(currentPath.slice(0, 1))}
              className="flex items-center gap-2 font-medium text-[#1d2524] transition hover:text-[#4cada9]"
            >
              <House className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </button>
          </li>
          {segments.map((segment, index) => {
            const nextPath = currentPath.slice(0, index + 2);
            return (
              <li
                key={`${segment}-${index}`}
                className="flex items-center min-w-0 gap-2"
              >
                <ChevronRight className="w-4 h-4 shrink-0" />
                <button
                  type="button"
                  onClick={() => onGoToPath(nextPath)}
                  className="truncate font-medium text-[#1d2524] transition hover:text-[#4cada9]"
                >
                  {segment}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </section>
  );
}
