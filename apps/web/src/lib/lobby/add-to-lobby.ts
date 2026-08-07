"use client";

import { readFileWithKey } from "@/lib/analysis/cache";
import { ANALYSIS_VERSION } from "@/lib/analysis/types";
import { lobbyCommands } from "@/lib/realtime/socket";
import { stripExtension } from "@/lib/song-explorer/audio-files";
import { loadMetadata } from "@/lib/song-explorer/metadata-cache";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useLobbyStore } from "@/stores/useLobbyStore";

/**
 * Einen Song aus der eigenen Bibliothek in die Lobby stellen.
 *
 * Die Angaben kommen von hier, nicht vom Server: Der hat die Datei nicht und könnte weder
 * Titel noch Länge nachsehen. Der Hash hängt am Inhalt — dadurch landen später die Ergebnisse
 * aller Mitsingenden am selben Song, obwohl nur einer die Datei besitzt.
 */
export async function addSongToLobby(file: AudioFile): Promise<{ ok: boolean; message?: string }> {
  const [{ key }, tags] = await Promise.all([
    readFileWithKey(file),
    loadMetadata(file).catch(() => undefined),
  ]);

  // Der Chart des Besitzers entscheidet — die anderen bekommen ihn später von ihm.
  await useAnalysisStore.getState().load(file);
  const analysis = useAnalysisStore.getState().results[file.path];

  // Ohne diese Zuordnung könnte ich meinen eigenen Song später nicht abspielen.
  useLobbyStore.getState().rememberFile(key, file);

  return lobbyCommands.addSong({
    songHash: key,
    title: tags?.title ?? stripExtension(file.name),
    artist: tags?.artist ?? "",
    durationMs: tags?.durationMs ?? 0,
    analysed: Boolean(analysis),
    analysisVersion: analysis?.meta.version ?? ANALYSIS_VERSION,
  });
}
