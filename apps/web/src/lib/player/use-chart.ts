"use client";

import type { Chart } from "@vocalwonder/core";
import { useEffect } from "react";

import type { AudioFile } from "@/lib/song-explorer/types";
import { useAnalysisStore } from "@/stores/useAnalysisStore";

/**
 * Der Chart zum Song, falls er analysiert wurde. Ohne Chart bleibt der Spielmodus im
 * Freestyle: Musik läuft, die eigene Linie ist sichtbar, nur die Sollnoten fehlen.
 */
export const useChart = (song: AudioFile): Chart | undefined => {
  const load = useAnalysisStore((state) => state.load);
  const result = useAnalysisStore((state) => state.results[song.path]);

  useEffect(() => {
    void load(song);
  }, [song, load]);

  return result?.chart;
};
