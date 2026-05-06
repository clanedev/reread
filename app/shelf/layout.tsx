import type { ReactNode } from "react";

export default function ShelfRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f6f7f6] text-[#1d2524]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        {children}
      </div>
      <footer className="mt-10 p-4 text-center text-gray-400 cursor-default">
        ^
      </footer>
    </main>
  );
}
