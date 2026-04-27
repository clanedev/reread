import type { DirectoryEntry } from './types';

export async function listDirectoryEntries(
  handle: FileSystemDirectoryHandle,
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];

  for await (const [name, entryHandle] of handle.entries()) {
    entries.push({
      name,
      kind: entryHandle.kind,
    });
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'directory' ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}

export function getPathKey(path: string[]) {
  return path.join('/');
}
