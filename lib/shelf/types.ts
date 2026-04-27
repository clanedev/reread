export interface ShelfState {
  currentPath: string[];
  handles: Record<string, FileSystemDirectoryHandle>;
}

export type DirectoryEntry = {
  name: string;
  kind: 'file' | 'directory';
};
