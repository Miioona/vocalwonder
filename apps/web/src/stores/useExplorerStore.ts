import { create } from "zustand";

import {
  forgetSongFolder,
  hasReadPermission,
  isDirectoryPickerSupported,
  loadSongFolder,
  pickSongFolder,
  requestReadPermission,
  saveSongFolder,
} from "@/lib/song-explorer/folder-access";
import { clearMetadataCache } from "@/lib/song-explorer/metadata-cache";
import type { AudioFile, SubFolder } from "@/lib/song-explorer/types";

/**
 * Zustand des Song-Explorers: welcher Ordner freigegeben ist, wo wir darin stehen und
 * was ausgewählt ist. Die Aktionen orchestrieren nur — gelesen und gespeichert wird in
 * `lib/song-library`.
 *
 * Hier gehört ausschließlich grober Zustand hinein, der sich selten ändert. Alles
 * Hochfrequente — Tonhöhen-Frames aus dem Mikrofon, Playhead-Position, Audio-Buffer —
 * bleibt draußen und läuft über Refs und die Renderschleife. Sonst rendert React beim
 * Spielen 50-mal pro Sekunde.
 */

export type FolderStatus =
  | "loading"
  /** Browser ohne File System Access API (Firefox, Safari). */
  | "unsupported"
  | "empty"
  /** Ordner ist gemerkt, aber der Zugriff muss per Klick erneuert werden. */
  | "needs-permission"
  | "ready";

interface ExplorerState {
  status: FolderStatus;
  /** Freigegebener Wurzelordner. Auch bei `needs-permission` gesetzt. */
  root?: FileSystemDirectoryHandle;
  /** Gerade geöffneter Ordner innerhalb des Wurzelordners. */
  folder?: SubFolder;
  /** Der Song, den die Preview anzeigt. */
  selectedFile?: AudioFile;
  error?: string;

  /** Beim Start: gemerkten Ordner aus IndexedDB holen und Berechtigung prüfen. */
  restore: () => Promise<void>;
  pick: () => Promise<void>;
  grantPermission: () => Promise<void>;
  forget: () => Promise<void>;

  openFolder: (folder: SubFolder) => void;
  selectFile: (file: AudioFile) => void;
}

const rootFolder = (handle: FileSystemDirectoryHandle): SubFolder => ({
  name: handle.name,
  path: "",
  handle,
});

const toMessage = (err: unknown): string =>
  err instanceof Error ? err.message : "Unbekannter Fehler.";

export const useExplorerStore = create<ExplorerState>((set, get) => ({
  status: "loading",
  root: undefined,
  folder: undefined,
  selectedFile: undefined,
  error: undefined,

  restore: async () => {
    if (!isDirectoryPickerSupported()) {
      set({ status: "unsupported" });
      return;
    }

    try {
      const handle = await loadSongFolder();
      if (!handle) {
        set({ status: "empty" });
        return;
      }

      // Der Handle überlebt den Reload, die Berechtigung nicht: `requestPermission`
      // funktioniert nur aus einer Nutzerinteraktion heraus, deshalb der eigene Zustand.
      const granted = await hasReadPermission(handle);
      set(
        granted
          ? { status: "ready", root: handle, folder: rootFolder(handle) }
          : { status: "needs-permission", root: handle },
      );
    } catch (err) {
      set({ status: "empty", error: toMessage(err) });
    }
  },

  pick: async () => {
    set({ error: undefined });
    try {
      const handle = await pickSongFolder();
      if (!handle) return; // abgebrochen
      await saveSongFolder(handle);
      // Pfade sind relativ zum Wurzelordner — nach dem Wechsel wären sie mehrdeutig.
      clearMetadataCache();
      set({
        status: "ready",
        root: handle,
        folder: rootFolder(handle),
        selectedFile: undefined,
      });
    } catch (err) {
      set({ error: toMessage(err) });
    }
  },

  grantPermission: async () => {
    const handle = get().root;
    if (!handle) return;

    set({ error: undefined });
    try {
      const granted = await requestReadPermission(handle);
      if (granted) set({ status: "ready", folder: rootFolder(handle) });
      else set({ error: "Zugriff wurde abgelehnt." });
    } catch (err) {
      set({ error: toMessage(err) });
    }
  },

  forget: async () => {
    set({ error: undefined });
    try {
      await forgetSongFolder();
      clearMetadataCache();
      set({ status: "empty", root: undefined, folder: undefined, selectedFile: undefined });
    } catch (err) {
      set({ error: toMessage(err) });
    }
  },

  openFolder: (folder) => set({ folder }),
  selectFile: (selectedFile) => set({ selectedFile }),
}));
