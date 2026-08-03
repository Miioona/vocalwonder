import { parseBlob } from "music-metadata";

import { openFile } from "./open-file";
import type { AudioFile, SongMetadata } from "./types";

/**
 * Liest die Tags einer Audiodatei (ID3, Vorbis-Comments, MP4-Atoms — `music-metadata`
 * erkennt das Format selbst).
 *
 * Das eingebettete Cover kommt als Rohdaten und wird zu einer Object-URL. Wer die hier
 * bekommt, ist fürs Freigeben zuständig: `URL.revokeObjectURL`, sonst bleibt das Bild
 * bis zum Reload im Speicher.
 */
export interface ReadMetadataOptions {
  /**
   * Länge notfalls durch Scannen der Frames ermitteln. Bei VBR-MP3s ohne Header-Angabe
   * der einzige Weg zu einer korrekten Dauer — kostet aber einen Durchlauf durch die
   * ganze Datei. Für die Preview sinnvoll, für 120 Listenzeilen nicht.
   */
  precise?: boolean;
}

export async function readSongMetadata(
  file: AudioFile,
  { precise = false }: ReadMetadataOptions = {},
): Promise<SongMetadata> {
  const blob = await openFile(file);

  const { common, format } = await parseBlob(blob, { duration: precise });

  const picture = common.picture?.[0];

  return {
    title: clean(common.title),
    artist: clean(common.artist ?? common.albumartist),
    album: clean(common.album),
    durationMs: format.duration === undefined ? undefined : format.duration * 1000,
    coverUrl: picture
      ? // Kopie in einen eigenen ArrayBuffer: Der Parser-Puffer ist als SharedArrayBuffer
        // typisiert, den nimmt `Blob` nicht an.
        URL.createObjectURL(new Blob([new Uint8Array(picture.data)], { type: picture.format }))
      : undefined,
  };
}

/** Leere und nur aus Leerzeichen bestehende Tags sind so gut wie nicht vorhanden. */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
