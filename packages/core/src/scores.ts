/**
 * Ergebnisse eines gespielten Songs — geteilt zwischen Frontend und Backend.
 *
 * Der Song wird über den Hash seiner Datei erkannt, nicht über Pfad oder Titel: Dieselbe
 * Datei ist auf jedem Gerät dieselbe, egal wie sie heißt.
 */

/**
 * Wie gespielt wurde.
 *
 * Ohne diese Unterscheidung stünden später allein gesungene Durchgänge in derselben
 * Bestenliste wie Duelle — vergleichbar sind sie nicht.
 */
export type GameType = "solo" | "duel";

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
  gameType?: GameType;
  /** Klammert die Ergebnisse einer Lobby-Sitzung zusammen. */
  roundId?: string;
}

export interface SongScore extends SongScoreInput {
  id: string;
  userId: string;
  /** ISO-Zeitstempel. */
  playedAt: string;
}
