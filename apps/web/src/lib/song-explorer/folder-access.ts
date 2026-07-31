import { clear, createStore, get, set } from "idb-keyval";

/**
 * Persistenz für den Songordner. Ein `FileSystemDirectoryHandle` lässt sich strukturiert
 * klonen und damit direkt in IndexedDB legen — so bleibt der Ordner über Reloads erhalten,
 * ohne dass der User ihn erneut auswählen muss.
 *
 * Die Berechtigung überlebt den Reload allerdings *nicht*: Nach dem Laden liefert
 * `queryPermission` "prompt", und `requestPermission` braucht eine Nutzerinteraktion.
 * Deshalb sind Handle-Wiederherstellung und Berechtigung hier getrennt.
 */

const store = createStore("vocalwonder", "song-library");
const HANDLE_KEY = "song-folder";

/** Chrome/Edge only — Firefox und Safari haben die API nicht. */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export async function loadSongFolder(): Promise<FileSystemDirectoryHandle | undefined> {
  return get<FileSystemDirectoryHandle>(HANDLE_KEY, store);
}

export async function saveSongFolder(handle: FileSystemDirectoryHandle): Promise<void> {
  await set(HANDLE_KEY, handle, store);
}

export async function forgetSongFolder(): Promise<void> {
  await clear(store);
}

/** Öffnet den Ordner-Dialog. Gibt `undefined` zurück, wenn der User abbricht. */
export async function pickSongFolder(): Promise<FileSystemDirectoryHandle | undefined> {
  if (!window.showDirectoryPicker)
    throw new Error("Ordnerauswahl wird in diesem Browser nicht unterstützt.");

  try {
    return await window.showDirectoryPicker({
      id: "vocalwonder-songs",
      mode: "read",
      startIn: "music",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return undefined;
    throw err;
  }
}

export async function hasReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: "read" })) === "granted";
}

/** Muss aus einem Klick heraus aufgerufen werden, sonst lehnt der Browser ab. */
export async function requestReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  return (await handle.requestPermission({ mode: "read" })) === "granted";
}
