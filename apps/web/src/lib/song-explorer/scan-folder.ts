import { isAudioFile } from "./audio-files";
import type { AudioFile } from "./types";

/**
 * Rekursiver Scan des kompletten Songordners. Wird aktuell von niemandem benutzt — er ist
 * die Grundlage für einen späteren "Alle Songs"-Eintrag, der quer über alle Unterordner geht.
 * Für die Explorer-Ansicht liest `read-directory.ts` jeweils nur einen Ordner.
 */

export interface ScanOptions {
  signal?: AbortSignal;
  /** Wird bei jedem Fund aufgerufen — für eine Fortschrittsanzeige bei großen Ordnern. */
  onProgress?: (found: number) => void;
}

export async function scanForAudioFiles(
  root: FileSystemDirectoryHandle,
  options: ScanOptions = {},
): Promise<AudioFile[]> {
  const files: AudioFile[] = [];
  await walk(root, "", files, options);
  files.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
  return files;
}

async function walk(
  dir: FileSystemDirectoryHandle,
  prefix: string,
  files: AudioFile[],
  options: ScanOptions,
): Promise<void> {
  for await (const entry of dir.values()) {
    options.signal?.throwIfAborted();

    if (entry.name.startsWith(".")) continue;

    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.kind === "directory") {
      await walk(entry, path, files, options);
    } else if (isAudioFile(entry.name)) {
      files.push({ path, name: entry.name, handle: entry });
      options.onProgress?.(files.length);
    }
  }
}
