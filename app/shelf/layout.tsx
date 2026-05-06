import type { ReactNode } from "react";

export default function ShelfRouteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f6f7f6] text-[#1d2524]">
      <div className="flex flex-col w-full max-w-6xl min-h-screen px-5 mx-auto lg:px-8">
        {children}
      </div>
      <footer className="p-4 mt-10 text-center text-gray-400 cursor-default">
        ^
      </footer>
    </main>
  );
}
