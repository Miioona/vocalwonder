import type { Chart } from "@vocalwonder/core";

import type { PitchCurve } from "./pitch-track";

/**
 * Was ein Analyselauf abliefert.
 *
 * Absichtlich mehr als nur die Balken: Die Trennung kostet ungefähr die Spieldauer des
 * Songs, ein zweiter Lauf für nachgereichte Daten wäre also teuer. Alles, was aus dem
 * Gesangs-Stem gewonnen werden kann, wird deshalb beim ersten Mal mitgeschrieben.
 */
export interface AnalysisResult {
  chart: Chart;
  /**
   * Rohe Tonhöhenkurve, alle 10 ms ein Rahmen. Grundlage für den Schlauch-Modus, für feine
   * Bewertung — und dafür, die Segmentierung mit anderen Schwellen zu wiederholen, ohne
   * erneut zu trennen.
   */
  pitch: PitchCurve;
  meta: AnalysisMeta;
}

export interface AnalysisMeta {
  /** Welches Trennmodell gelaufen ist. */
  model: string;
  /** Fassung der Analysekette. Hochzählen, wenn sich Ergebnisse dadurch ändern. */
  version: number;
  /** Zeitpunkt des Laufs, als ISO-Zeichenkette. */
  createdAt: string;
  /** Dauer des analysierten Audios. */
  durationMs: number;
  /** Rechenzeit der Trennung — für die Einschätzung, was ein erneuter Lauf kostet. */
  separationMs: number;
}

/** Bei Änderungen an Segmentierung oder Tonhöhenverfolgung erhöhen. */
export const ANALYSIS_VERSION = 1;

export type AnalysisStage = "decode" | "download" | "session" | "inference" | "notes";

export interface AnalysisProgress {
  stage: AnalysisStage;
  /** 0–1, wenn bekannt. */
  ratio?: number;
  message: string;
}
