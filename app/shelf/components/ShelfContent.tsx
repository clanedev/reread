"use client";

import type React from "react";

// State gate for shelf content.
export function ShelfContent({
  loading,
  error,
  hasShelf,
  children,
}: {
  loading: boolean;
  error: string;
  hasShelf: boolean;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="rounded-[1.4rem] border border-black/8 bg-white p-5 text-[#5f6c6a]">
        Loading shelf…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.4rem] border border-[#f0b4b4] bg-[#fff7f7] p-5 text-[#a04242]">
        {error}
      </div>
    );
  }

  if (!hasShelf) {
    return (
      <div className="rounded-[1.4rem] border border-black/8 bg-white p-5 text-[#5f6c6a]">
        No shelf is selected. Go back to the home page and choose a folder.
      </div>
    );
  }

  return children;
}
