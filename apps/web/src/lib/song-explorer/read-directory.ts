import { fileExtension, isAudioFile } from "./audio-files";
import type { AudioFile, DirectoryContents, SubFolder } from "./types";

/**
 * Liest **einen** Ordner — bewusst nicht rekursiv. Der Baum lädt seine Kinder erst beim
 * Aufklappen nach, sonst wartet man bei einer großen Sammlung sekundenlang auf nichts.
 * Der rekursive Scan in `scan-folder.ts` bleibt für die spätere "Alle Songs"-Ansicht.
 */
export async function readDirectory(
  dir: FileSystemDirectoryHandle,
  prefix = "",
  signal?: AbortSignal,
): Promise<DirectoryContents> {
  const folders: SubFolder[] = [];
  const files: AudioFile[] = [];
  const skippedCounts = new Map<string, number>();

  for await (const entry of dir.values()) {
    signal?.throwIfAborted();

    // Versteckte Einträge werden ausgelassen, aber mitgezählt — sonst verschwindet ein
    // Ordner spurlos, nur weil sein Name mit einem Punkt beginnt.
    if (entry.name.startsWith(".")) {
      skippedCounts.set("versteckt", (skippedCounts.get("versteckt") ?? 0) + 1);
      continue;
    }

    const path = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.kind === "directory") {
      folders.push({ name: entry.name, path, handle: entry });
    } else if (isAudioFile(entry.name)) {
      files.push({ name: entry.name, path, handle: entry });
    } else {
      const extension = fileExtension(entry.name) ?? "ohne Endung";
      skippedCounts.set(extension, (skippedCounts.get(extension) ?? 0) + 1);
    }
  }

  // Numerisch sortieren, damit "Track 2" vor "Track 10" landet.
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, undefined, { numeric: true });

  folders.sort(byName);
  files.sort(byName);

  const skipped = [...skippedCounts]
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count);

  return { folders, files, skipped };
}
