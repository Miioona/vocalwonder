import type { SkippedKind } from "./types";

/** Erkennung und Beschriftung von Audiodateien — reine Namensarbeit, kein Dateizugriff. */

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "m4a",
  "m4b",
  "aac",
  "flac",
  "ogg",
  "oga",
  "opus",
  "wav",
  "wave",
  "aiff",
  "aif",
  "aifc",
  "wma",
]);

/** Kleingeschriebene Endung ohne Punkt, oder `undefined` bei Dateien ohne Endung. */
export function fileExtension(name: string): string | undefined {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : undefined;
}

export function isAudioFile(name: string): boolean {
  const extension = fileExtension(name);
  return extension !== undefined && AUDIO_EXTENSIONS.has(extension);
}

/** "11 Bohemian Rhapsody.mp3" → "11 Bohemian Rhapsody" */
export function stripExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** 215_000 → "3:35". Ohne Wert der Platzhalter, damit die Zeile nicht springt. */
export function formatDuration(ms?: number): string {
  if (ms === undefined || !Number.isFinite(ms)) return "–:––";

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** "3× .jpg", aber "3× versteckt" — die Sammelkategorien sind keine Endungen. */
export function formatSkipped({ extension, count }: SkippedKind): string {
  const label =
    extension === "versteckt" || extension === "ohne Endung" ? extension : `.${extension}`;
  return `${count}× ${label}`;
}
