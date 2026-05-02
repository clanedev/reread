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
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
}

declare global {
  namespace React {
    interface HTMLAttributes {
      flow?: string;
    }
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    'foliate-view': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'foliate-paginator': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}

declare module 'foliate-js/view.js';
declare module 'foliate-js/paginator.js';
declare module 'foliate-js/epub.js';
