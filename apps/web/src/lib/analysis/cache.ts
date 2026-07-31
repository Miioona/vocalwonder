import { createStore, del, get, set } from "idb-keyval";

import type { AudioFile } from "@/lib/song-explorer/types";
import { ANALYSIS_VERSION, type AnalysisResult } from "./types";

/**
 * Analyseergebnisse überleben den Reload. Hier lohnt sich der Aufwand — anders als bei den
 * ID3-Tags kostet ein erneuter Lauf mehrere Minuten.
 *
 * Schlüssel ist ein Hash des Dateiinhalts, nicht der Pfad: Ein umbenannter oder verschobener
 * Song behält damit sein Ergebnis, und zwei Kopien derselben Datei teilen es sich.
 */

/**
 * Eigene Datenbank, nicht nur ein zweiter Objektspeicher in `vocalwonder`.
 *
 * Grund: `idb-keyval` legt Objektspeicher ausschließlich beim Erzeugen der Datenbank an.
 * Wer eine bestehende Datenbank um einen Speicher erweitern will, bräuchte eine
 * Versionsanhebung — die kennt die Bibliothek nicht. Bei Nutzern, die den Ordner schon
 * freigegeben hatten, existierte `analysis` deshalb nie.
 */
const store = createStore("vocalwonder-analysis", "results");

export async function fileKey(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function readAnalysis(key: string): Promise<AnalysisResult | undefined> {
  const stored = await get<AnalysisResult>(key, store);
  if (!stored) return undefined;

  // Nach Änderungen an der Analysekette sind alte Ergebnisse nicht mehr vergleichbar.
  if (stored.meta.version !== ANALYSIS_VERSION) {
    await del(key, store);
    return undefined;
  }

  return stored;
}

export async function writeAnalysis(key: string, result: AnalysisResult): Promise<void> {
  await set(key, result, store);
}

/** Für die Anzeige "Chart vorhanden", ohne das ganze Ergebnis zu laden. */
export async function hasAnalysis(key: string): Promise<boolean> {
  return (await readAnalysis(key)) !== undefined;
}

/** Liest die Datei einmal und liefert Bytes und Schlüssel — beides wird gebraucht. */
export async function readFileWithKey(file: AudioFile): Promise<{
  bytes: ArrayBuffer;
  key: string;
}> {
  const blob = await file.handle.getFile();
  const bytes = await blob.arrayBuffer();
  return { bytes, key: await fileKey(bytes) };
}
