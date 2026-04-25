'use client';

import { useState } from 'react';

export default function Home() {
  const [items, setItems] = useState<FileSystemHandle[]>([]);
  const [rootHandle, setRootHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

  async function handleDirectory() {
    const directories: FileSystemDirectoryHandle[] = [];
    const files: FileSystemFileHandle[] = [];
    const dirHandle = await window.showDirectoryPicker();
    setRootHandle(dirHandle);
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'directory') {
        directories.push(handle);
      } else if (handle.name.endsWith('.epub')) {
        console.log(handle);
        files.push(handle);
      }
    }
    setItems([...directories, ...files]);
  }
  if (!rootHandle) {
    return (
      <button onClick={handleDirectory} className="border border-amber-400 ">
        Choose a Directory
      </button>
    );
  }
  return (
    <div className="h-screen flex flex-col max-w-4xl mx-auto">
      <ul>
        {items.map((item) => (
          <li key={item.name} className="p-2">
            {item.kind}-{item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
