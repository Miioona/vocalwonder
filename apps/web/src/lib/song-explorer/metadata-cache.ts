import { readSongMetadata, type ReadMetadataOptions } from "./read-metadata";
import type { AudioFile, SongMetadata } from "./types";

/**
 * Cache für gelesene Tags, damit Scrollen in der Liste nicht dieselben Dateien wieder und
 * wieder parst. Der Cache besitzt die Cover-Object-URLs: Wer hier etwas herausnimmt, gibt
 * sie **nicht** frei — das passiert beim Verdrängen und beim Leeren.
 *
 * Zwei Begrenzungen: höchstens `MAX_ENTRIES` Einträge (sonst sammeln sich Cover im
 * Speicher an) und höchstens `MAX_PARALLEL` gleichzeitige Lesevorgänge (sonst startet ein
 * Sprung in der Liste zwanzig Dateizugriffe auf einmal).
 */

const MAX_ENTRIES = 200;
const MAX_PARALLEL = 4;

const cache = new Map<string, SongMetadata>();
const pending = new Map<string, Promise<SongMetadata>>();

let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }

  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

export function getCachedMetadata(path: string): SongMetadata | undefined {
  return cache.get(path);
}

export function loadMetadata(file: AudioFile, options?: ReadMetadataOptions) {
  const cached = cache.get(file.path);
  if (cached) return Promise.resolve(cached);

  // Mehrere Zeilen können denselben Song anfordern (Preview und Liste) — einmal reicht.
  const inFlight = pending.get(file.path);
  if (inFlight) return inFlight;

  const promise = withSlot(() => readSongMetadata(file, options))
    .then((metadata) => {
      remember(file.path, metadata);
      return metadata;
    })
    .finally(() => pending.delete(file.path));

  pending.set(file.path, promise);
  return promise;
}

/** Beim Wechsel des Wurzelordners aufrufen: Pfade wären sonst mehrdeutig. */
export function clearMetadataCache(): void {
  for (const metadata of cache.values()) {
    if (metadata.coverUrl) URL.revokeObjectURL(metadata.coverUrl);
  }
  cache.clear();
}

function remember(path: string, metadata: SongMetadata): void {
  cache.set(path, metadata);

  // Map behält die Einfügereihenfolge, der erste Eintrag ist also der älteste.
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;

    const evicted = cache.get(oldest);
    cache.delete(oldest);
    if (evicted?.coverUrl) URL.revokeObjectURL(evicted.coverUrl);
  }
}
