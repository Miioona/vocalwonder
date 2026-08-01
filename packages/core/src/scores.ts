/**
 * Ergebnisse eines gespielten Songs — geteilt zwischen Frontend und Backend.
 *
 * Der Song wird über den Hash seiner Datei erkannt, nicht über Pfad oder Titel: Dieselbe
 * Datei ist auf jedem Gerät dieselbe, egal wie sie heißt.
 */
export interface SongScoreInput {
  songHash: string;
  title: string;
  artist: string;
  /** 0–10000, wie im Spiel angezeigt. */
  points: number;
  /** 0–1, der getroffene Anteil. */
  ratio: number;
  hitNotes: number;
  totalNotes: number;
  durationMs: number;
  /** Fassung der Analysekette, mit der der Chart entstanden ist. */
  analysisVersion: number;
}

export interface SongScore extends SongScoreInput {
  id: string;
  userId: string;
  /** ISO-Zeitstempel. */
  playedAt: string;
}
