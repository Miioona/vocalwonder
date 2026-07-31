/**
 * Die File System Access API ist in lib.dom nur teilweise typisiert: Die Handles gibt es,
 * `showDirectoryPicker` und die Permission-Methoden fehlen. Hier nur das, was wir benutzen.
 */

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface DirectoryPickerOptions {
  /** Der Browser merkt sich pro id, wo der Dialog zuletzt stand. */
  id?: string;
  mode?: "read" | "readwrite";
  startIn?:
    FileSystemHandle | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

interface Window {
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
}
