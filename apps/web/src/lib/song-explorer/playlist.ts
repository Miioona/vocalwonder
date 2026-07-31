import type { AudioFile } from "./types";

/**
 * Der nächste Song in derselben Liste, am Ende wieder von vorn.
 *
 * `undefined`, wenn es nichts vorzuschlagen gibt: bei einem einzigen Song wäre der
 * Vorschlag derselbe, den man gerade gehört hat.
 */
export function nextSong(files: readonly AudioFile[], currentPath: string): AudioFile | undefined {
  if (files.length < 2) return undefined;

  const index = files.findIndex((file) => file.path === currentPath);
  if (index === -1) return undefined;

  return files[(index + 1) % files.length];
}
