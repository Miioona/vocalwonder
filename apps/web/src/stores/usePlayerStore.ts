import { create } from "zustand";

import type { AudioFile } from "@/lib/song-explorer/types";

/**
 * Wechsel zwischen Bibliothek und Spielmodus.
 *
 * Bewusst ein Overlay statt einer eigenen Route: Der Datei-Handle und die dekodierten
 * Audiodaten lassen sich nicht in eine URL packen. Der Spielbildschirm wird beim Verlassen
 * komplett ausgehängt — damit sterben Canvas, Renderschleife und AudioContext zwangsläufig
 * mit, statt im Hintergrund weiterzulaufen.
 */
interface PlayerState {
  mode: "browse" | "play";
  /** Der Song, der gerade gespielt wird. */
  song?: AudioFile;

  start: (song: AudioFile) => void;
  exit: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  mode: "browse",
  song: undefined,

  start: (song) => set({ mode: "play", song }),
  exit: () => set({ mode: "browse", song: undefined }),
}));
