interface Window {
  showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
}

interface FileSystemHandle {
  queryPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  name: string;
  entries(): AsyncIterableIterator<[
    string,
    FileSystemFileHandle | FileSystemDirectoryHandle,
  ]>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  name: string;
}
