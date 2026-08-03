import type { AudioFile } from "./types";

/**
 * Die Bytes eines Songs — egal woher er kommt.
 *
 * Songs aus der Bibliothek liegen hinter einem Handle der File System Access API,
 * Beispielsongs liegen als Datei beim Frontend. Alles Weitere — Tags lesen, Hash bilden,
 * dekodieren — arbeitet ohnehin auf einem Blob und muss den Unterschied nicht kennen.
 */
export async function openFile(file: AudioFile): Promise<Blob> {
  if (file.handle) return file.handle.getFile();

  if (file.url) {
    const response = await fetch(file.url);
    if (!response.ok) throw new Error(`${file.name} nicht abrufbar (${response.status})`);
    return response.blob();
  }

  throw new Error(`${file.name} hat weder Handle noch Adresse`);
}
