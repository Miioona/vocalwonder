import { allNotes, type Chart, type Note } from "./chart";
import { pitchClassDistance } from "./pitch";

/**
 * Bewertung des Gesangs.
 *
 * Bewusst frei von Mikrofon, Canvas und React: Herein kommen Zeit und Tonhöhe, heraus kommen
 * Punkte. Damit lässt sich die Bewertung mit erfundenen Daten prüfen — bei etwas, das über
 * Gewinnen und Verlieren entscheidet, ist das den Aufwand wert.
 *
 * Die Messung ist **oktav-agnostisch**: Nur die Tonklasse zählt, eine Männerstimme darf einen
 * Frauengesang eine Oktave tiefer treffen. Genau so macht es SingStar auch.
 */

export interface ScoreSettings {
  /** Bis hierher gilt ein Ton als getroffen (in Halbtönen). */
  toleranceSemitones: number;
  /** Bis hierher gilt er als sauber getroffen und zählt voll. */
  perfectSemitones: number;
  /** Was ein Treffer außerhalb der sauberen Zone wert ist (0–1). */
  partialCredit: number;
}

export const DEFAULT_SCORE_SETTINGS: ScoreSettings = {
  toleranceSemitones: 1.5,
  perfectSemitones: 0.8,
  partialCredit: 0.6,
};

/** Ergebnis einer einzelnen Note. */
export interface NoteScore {
  /** Anteil der Notendauer, in dem getroffen wurde (0–1). */
  ratio: number;
  /** Gewichtete Punkte dieser Note, vor der Skalierung. */
  points: number;
}

export interface ScoreSnapshot {
  /** 0–1 über alle bisher gesungenen Noten. */
  ratio: number;
  /** Anzeigepunkte, auf `MAX_POINTS` skaliert. */
  points: number;
  /** Wie viele Noten mindestens zur Hälfte getroffen wurden. */
  hitNotes: number;
  /** Noten, die bereits vorbei sind. */
  finishedNotes: number;
  totalNotes: number;
}

/** Gesamtpunktzahl bei perfektem Gesang — die runde Zahl fühlt sich mehr nach Spiel an. */
export const MAX_POINTS = 10_000;

export interface Scorer {
  /**
   * Meldet eine Messung. `midi` fehlt, wenn gerade nichts Verwertbares erkannt wurde.
   * Erwartet einen **festen Takt** (etwa alle 20 ms) — sonst hinge das Ergebnis an der
   * Bildrate des Geräts.
   */
  feed: (timeMs: number, midi: number | undefined, stepMs: number) => void;
  /** Aktueller Stand für die Anzeige. */
  snapshot: () => ScoreSnapshot;
  /** Ergebnis je Note, in der Reihenfolge des Charts — für die Nachschau. */
  noteScores: () => NoteScore[];
  /**
   * Getroffener Anteil je Note (0–1), in derselben Reihenfolge wie `allNotes(chart)`.
   *
   * Gibt einen wiederverwendeten Puffer zurück, damit der Renderer ihn pro Frame lesen kann,
   * ohne bei jedem Bild hunderte Objekte anzulegen. Nicht festhalten, nicht verändern.
   */
  ratios: () => Float32Array;
  reset: () => void;
}

export function createScorer(chart: Chart, settings: Partial<ScoreSettings> = {}): Scorer {
  const options: ScoreSettings = { ...DEFAULT_SCORE_SETTINGS, ...settings };

  // Alle Noten führen, auch Freestyle: Der Renderer zeichnet ebenfalls alle, und zwei
  // unterschiedliche Nummerierungen wären ein Zeitzünder. Freestyle bekommt Gewicht 0 und
  // fällt dadurch aus der Wertung, ohne die Reihenfolge zu verschieben.
  const notes = allNotes(chart);

  // Getroffene Millisekunden je Note. Lange Noten wiegen dadurch mehr als kurze, ohne dass
  // wir sie gesondert gewichten müssten.
  let credited = new Float64Array(notes.length);
  const ratioBuffer = new Float32Array(notes.length);
  let index = 0;

  const weightOf = (note: Note): number => {
    if (note.type === "freestyle") return 0;
    return note.type === "golden" ? 2 : 1;
  };
  const totalWeight = notes.reduce((sum, note) => sum + note.durationMs * weightOf(note), 0);

  return {
    feed: (timeMs, midi, stepMs) => {
      if (midi === undefined) return;

      // Der Zeiger wandert mit; ein Song wird von vorn nach hinten gesungen.
      while (index < notes.length && noteEnd(notes[index]) < timeMs) index += 1;

      const note = notes[index];
      if (!note || timeMs < note.startMs) return;

      if (weightOf(note) === 0) return;

      const distance = pitchClassDistance(midi, note.midi);
      if (distance > options.toleranceSemitones) return;

      const quality = distance <= options.perfectSemitones ? 1 : options.partialCredit;
      // Nicht über die Notendauer hinaus gutschreiben, sonst käme man über 100 %.
      const room = Math.max(0, note.durationMs - (credited[index] ?? 0));
      credited[index] = (credited[index] ?? 0) + Math.min(stepMs, room) * quality;
    },

    snapshot: () => {
      let earned = 0;
      let hitNotes = 0;
      let finishedNotes = 0;

      let scoredNotes = 0;

      for (const [i, note] of notes.entries()) {
        if (weightOf(note) === 0) continue;

        scoredNotes += 1;
        const hit = credited[i] ?? 0;
        earned += hit * weightOf(note);
        if (hit / note.durationMs >= 0.5) hitNotes += 1;
        if (i < index) finishedNotes += 1;
      }

      const ratio = totalWeight === 0 ? 0 : earned / totalWeight;

      return {
        ratio,
        points: Math.round(ratio * MAX_POINTS),
        hitNotes,
        finishedNotes,
        totalNotes: scoredNotes,
      };
    },

    ratios: () => {
      for (const [i, note] of notes.entries()) {
        ratioBuffer[i] = Math.min(1, (credited[i] ?? 0) / note.durationMs);
      }
      return ratioBuffer;
    },

    noteScores: () =>
      notes.map((note, i) => {
        const ratio = Math.min(1, (credited[i] ?? 0) / note.durationMs);
        return { ratio, points: ratio * note.durationMs * weightOf(note) };
      }),

    reset: () => {
      credited = new Float64Array(notes.length);
      index = 0;
    },
  };
}

function noteEnd(note: Note | undefined): number {
  return note ? note.startMs + note.durationMs : Number.POSITIVE_INFINITY;
}
