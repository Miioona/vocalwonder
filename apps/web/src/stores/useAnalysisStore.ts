import { create } from "zustand";

import { readAnalysis, readFileWithKey, writeAnalysis } from "@/lib/analysis/cache";
import { runAnalysis, type AnalysisRun } from "@/lib/analysis/run-analysis";
import { matchesCurrentVersion, readShippedChart } from "@/lib/analysis/shipped-chart";
import type { AnalysisProgress, AnalysisResult } from "@/lib/analysis/types";
import type { AudioFile } from "@/lib/song-explorer/types";

/**
 * Die laufende Analyse und die Ergebnisse dieser Sitzung.
 *
 * Bewusst **ein** Lauf zur Zeit: Die Trennung braucht ungefähr die Spieldauer des Songs und
 * lastet die GPU aus — zwei parallele Läufe wären beide langsamer als einer nach dem anderen.
 *
 * Die Ergebnisse liegen zusätzlich in IndexedDB; diese Ablage hier spart nur den erneuten
 * Zugriff innerhalb einer Sitzung.
 */
interface AnalysisState {
  /** Pfad des Songs, der gerade analysiert wird. */
  runningPath?: string;
  progress?: AnalysisProgress;
  error?: string;
  /** Ergebnisse dieser Sitzung, nach Songpfad. */
  results: Record<string, AnalysisResult>;

  analyse: (file: AudioFile) => Promise<void>;
  /** Holt ein früher gespeichertes Ergebnis in die Sitzung, falls vorhanden. */
  load: (file: AudioFile) => Promise<void>;
  /** Ergebnis von außen setzen — die Werkbank schiebt so ihren Chart in den Spielmodus. */
  setResult: (path: string, result: AnalysisResult) => void;
  cancel: () => void;
}

let current: AnalysisRun | undefined;

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  runningPath: undefined,
  progress: undefined,
  error: undefined,
  results: {},

  analyse: async (file) => {
    if (get().runningPath) return;

    set({ runningPath: file.path, error: undefined, progress: undefined });

    const run = runAnalysis(file, (progress) => set({ progress }));
    current = run;

    try {
      const result = await run.result;
      set((state) => ({ results: { ...state.results, [file.path]: result } }));
    } catch (err) {
      console.error("[analyse]", err);
      set({ error: err instanceof Error ? err.message : "Analyse fehlgeschlagen." });
    } finally {
      current = undefined;
      set({ runningPath: undefined, progress: undefined });
    }
  },

  load: async (file) => {
    if (get().results[file.path]) return;

    try {
      // Kostet einmal das Lesen der Datei fürs Hashen — der Schlüssel hängt am Inhalt,
      // damit ein umbenannter Song sein Ergebnis behält.
      const { key } = await readFileWithKey(file);
      const cached = await readAnalysis(key);

      // Beispielsongs bringen ihren Chart mit; für alles andere ist hier Schluss, wenn im
      // Cache nichts liegt.
      const stored = cached ?? (await readShippedChart(file, key));
      if (!stored) return;

      if (!cached && matchesCurrentVersion(stored)) await writeAnalysis(key, stored);

      // Ergebnisse von vor der Einführung des Hashes nachrüsten — der Schlüssel ist ja
      // genau dieser Hash. Sonst ließe sich ein Ergebnis keinem Song zuordnen, und das
      // Speichern der Punkte scheitert stillschweigend.
      if (!stored.meta.songHash) {
        stored.meta.songHash = key;
        await writeAnalysis(key, stored);
      }

      set((state) => ({ results: { ...state.results, [file.path]: stored } }));
    } catch (err) {
      // Kein Ergebnis zu haben ist kein Fehler — die Preview zeigt dann "nicht analysiert".
      // Ein kaputter Cache-Zugriff wäre aber einer, deshalb in die Konsole damit.
      console.error("[analyse:load]", err);
    }
  },

  setResult: (path, result) => set((state) => ({ results: { ...state.results, [path]: result } })),

  cancel: () => {
    current?.cancel();
    current = undefined;
    set({ runningPath: undefined, progress: undefined });
  },
}));
