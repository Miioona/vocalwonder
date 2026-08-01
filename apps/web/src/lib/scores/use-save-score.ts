"use client";

import type { Chart, ScoreSnapshot } from "@vocalwonder/core";
import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/auth-client";
import { QUERY_KEYS } from "@/lib/query-keys";
import { getCachedMetadata } from "@/lib/song-explorer/metadata-cache";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { saveScore } from "./save-score";

/**
 * Schickt das Ergebnis ans Backend, sobald ein Song zu Ende ist.
 *
 * Nur mit Konto und nur einmal je Durchgang. Ohne Anmeldung passiert schlicht nichts — das
 * Spiel funktioniert auch so, das Ergebnis bleibt dann eben auf dem Bildschirm.
 */
export const useSaveScore = ({
  song,
  chart,
  snapshot,
  durationMs,
  finished,
}: {
  song: AudioFile;
  chart?: Chart;
  snapshot?: ScoreSnapshot;
  durationMs: number;
  finished: boolean;
}) => {
  const { data: session } = useSession();
  const result = useAnalysisStore((state) => state.results[song.path]);
  const queryClient = useQueryClient();
  const sent = useRef(false);

  useEffect(() => {
    if (!finished) {
      // Neuer Durchgang: wieder scharf schalten.
      sent.current = false;
      return;
    }

    if (sent.current || !session || !chart || !snapshot) return;

    const songHash = result?.meta.songHash;
    if (!songHash) {
      console.error("[scores] kein Datei-Hash im Analyseergebnis — nicht gespeichert");
      return;
    }

    sent.current = true;

    // Die Tags sind die bessere Quelle: Ältere Charts tragen noch den Dateinamen als Titel,
    // weil sie vor dieser Änderung analysiert wurden.
    const tags = getCachedMetadata(song.path);

    void saveScore({
      songHash,
      title: tags?.title ?? chart.title,
      artist: tags?.artist ?? chart.artist,
      points: snapshot.points,
      ratio: snapshot.ratio,
      hitNotes: snapshot.hitNotes,
      totalNotes: snapshot.totalNotes,
      durationMs,
      analysisVersion: result.meta.version,
    })
      // Der Verlauf in den Einstellungen soll den frischen Durchgang zeigen.
      .then(() => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_SCORES] }))
      .catch((error: unknown) => console.error("[scores]", error));
  }, [finished, session, chart, snapshot, durationMs, result, queryClient, song.path]);
};
