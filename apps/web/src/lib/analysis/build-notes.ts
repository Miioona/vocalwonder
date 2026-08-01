import type { Chart, Note, Phrase } from "@vocalwonder/core";

import { peakRms, type PitchCurve } from "./pitch-track";

/**
 * Aus der Tonhöhenkurve werden Balken.
 *
 * Das ist der Teil mit den Stellschrauben — die Kurve ist zappelig, die Balken sollen es
 * nicht sein. Alle Schwellen stehen als Konstanten oben, damit man sie beim Ausprobieren
 * schnell findet.
 */

/** Die Stellschrauben der Segmentierung. Alle Zeiten in Millisekunden. */
export interface Segmentation {
  /** Fensterbreite des Medianfilters in Rahmen. Ungerade Werte sind sinnvoll. */
  medianWindow: number;
  /** Unter diesem Anteil der lautesten Stelle gilt ein Rahmen als Pause. */
  silenceRatio: number;
  /** Kürzere Segmente sind Erkennungsfehler, keine gesungenen Töne. */
  minNoteMs: number;
  /** Lücken darunter werden überbrückt, statt eine Note zu zerhacken (Konsonanten). */
  maxBridgeMs: number;
  /**
   * Wie weit die Stimme vom Ton der laufenden Note abweichen darf, ohne dass eine neue
   * beginnt (in Halbtönen). Ohne Toleranz zerfällt jede gehaltene Note in Schnipsel.
   */
  pitchTolerance: number;
  /** So lange muss eine Abweichung anhalten, bevor sie als neuer Ton gilt. */
  switchMs: number;
  /** Ab dieser Pause beginnt eine neue Phrase — später eine Textzeile. */
  phraseGapMs: number;
  /**
   * Alle Noten um diesen Wert nach vorn ziehen.
   *
   * Die Erkennung setzt Anfänge systematisch zu spät: Ein Anschlag ist erst dann ein
   * messbarer Ton, wenn der Konsonant durch ist und das Analysefenster genug vom neuen Ton
   * enthält. Ohne Ausgleich hinken die Balken dem Gesang hinterher.
   */
  onsetShiftMs: number;
  /**
   * Zwei aufeinanderfolgende Noten werden zu einer, wenn sie dichter beieinanderliegen als
   * diese Lücke **und** sich um weniger als `mergeToleranceSemitones` unterscheiden.
   *
   * Die Lücke ist das entscheidende Kriterium: Balken, die nur entstanden sind, weil die
   * Stimme über die Toleranzgrenze gewandert ist, stoßen lückenlos aneinander. Bewusst
   * getrennte Töne haben eine Pause dazwischen.
   */
  mergeGapMs: number;
  mergeToleranceSemitones: number;
}

export const DEFAULT_SEGMENTATION: Segmentation = {
  medianWindow: 5,
  silenceRatio: 0.02,
  minNoteMs: 70,
  maxBridgeMs: 120,
  pitchTolerance: 0.9,
  switchMs: 60,
  phraseGapMs: 800,
  onsetShiftMs: 60,
  mergeGapMs: 40,
  mergeToleranceSemitones: 0.8,
};

export interface BuildOptions {
  title: string;
  artist: string;
  /** Abweichungen von den Standardwerten — die Werkbank reicht hier ihre Regler durch. */
  segmentation?: Partial<Segmentation>;
}

export function buildChart(
  curve: PitchCurve,
  { title, artist, segmentation }: BuildOptions,
): Chart {
  const options: Segmentation = { ...DEFAULT_SEGMENTATION, ...segmentation };

  const smoothed = smooth(curve, options);
  const notes = toNotes(smoothed, curve.frameMs, options);

  return {
    title,
    artist,
    source: "analysis",
    phrases: toPhrases(notes, options),
    meta: {},
  };
}

/**
 * Medianfilter über die Halbtöne. Der Median ist hier richtig, nicht der Mittelwert:
 * Ein einzelner Ausreißer eine Oktave daneben zieht den Mittelwert mit, den Median nicht.
 */
function smooth(curve: PitchCurve, options: Segmentation): (number | undefined)[] {
  const silenceFloor = peakRms(curve) * options.silenceRatio;
  const half = Math.floor(options.medianWindow / 2);

  const usable = (index: number): number | undefined => {
    const midi = curve.midi[index];
    const rms = curve.rms[index];
    if (midi === undefined || Number.isNaN(midi)) return undefined;
    if (rms === undefined || rms < silenceFloor) return undefined;
    return midi;
  };

  return Array.from(curve.midi, (_, index) => {
    if (usable(index) === undefined) return undefined;

    const values: number[] = [];
    for (let offset = -half; offset <= half; offset += 1) {
      const neighbour = usable(index + offset);
      if (neighbour !== undefined) values.push(neighbour);
    }

    if (values.length === 0) return undefined;
    values.sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)];
  });
}

interface OpenNote {
  startIndex: number;
  endIndex: number;
  /** Alle Tonhöhen dieser Note — der Ton am Ende ist ihr Median. */
  values: number[];
  /** Bezugston, gegen den die Toleranz gemessen wird. */
  center: number;
}

/**
 * Rahmen zu Noten zusammenfassen.
 *
 * Kein rahmenweises Runden auf Halbtöne: Gesang schwankt um seinen Zielton, und an der
 * Rundungsgrenze kippt das Ergebnis dann bei jedem Rahmen hin und her — eine gehaltene Note
 * zerfiel dadurch in Dutzende Schnipsel. Stattdessen läuft eine Note weiter, solange die
 * Stimme in ihrer Nähe bleibt; ein neuer Ton beginnt erst bei anhaltender Abweichung.
 *
 * Die Tonhöhe bleibt eine Kommazahl (Median aller Rahmen), das Notenmodell erlaubt das
 * ausdrücklich. Für das Halbtonraster der Anzeige wird später gerundet — die feine Auflösung
 * brauchen Bewertung und Schlauch-Modus.
 */
function toNotes(smoothed: (number | undefined)[], frameMs: number, options: Segmentation): Note[] {
  const switchFrames = Math.round(options.switchMs / frameMs);
  const bridgeFrames = Math.round(options.maxBridgeMs / frameMs);

  const notes: OpenNote[] = [];
  let current: OpenNote | undefined;
  /** Rahmen, die abweichen — erst wenn es genug sind, beginnt daraus eine neue Note. */
  let deviating: { index: number; value: number }[] = [];
  let silentFrames = 0;

  const close = () => {
    if (current) notes.push(current);
    current = undefined;
    deviating = [];
  };

  const open = (frames: { index: number; value: number }[]) => {
    const first = frames[0];
    if (!first) return;
    current = {
      startIndex: first.index,
      endIndex: frames[frames.length - 1]?.index ?? first.index,
      values: frames.map((frame) => frame.value),
      center: first.value,
    };
    deviating = [];
  };

  for (const [index, value] of smoothed.entries()) {
    if (value === undefined) {
      silentFrames += 1;
      // Kurze Lücken überbrücken — Konsonanten unterbrechen den Ton, nicht die Note.
      if (current && silentFrames > bridgeFrames) close();
      continue;
    }
    silentFrames = 0;

    if (!current) {
      open([{ index, value }]);
      continue;
    }

    if (Math.abs(value - current.center) <= options.pitchTolerance) {
      current.endIndex = index;
      current.values.push(value);
      // Der Bezugston wandert langsam mit, damit ein Glissando nicht abreißt.
      current.center += (value - current.center) * 0.1;
      deviating = [];
      continue;
    }

    deviating.push({ index, value });
    if (deviating.length >= switchFrames) {
      const next = deviating;
      close();
      open(next);
    }
  }

  close();

  const built = notes.map(({ startIndex, endIndex, values }): Note => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      startMs: Math.max(0, startIndex * frameMs - options.onsetShiftMs),
      // Der letzte Rahmen dauert selbst noch einen Rahmen lang an.
      durationMs: (endIndex - startIndex + 1) * frameMs,
      midi: sorted[Math.floor(sorted.length / 2)] ?? 0,
      text: "",
      type: "normal",
    };
  });

  // Erst zusammenführen, dann aussortieren: Zwei zu kurze Schnipsel können gemeinsam eine
  // gültige Note ergeben.
  return merge(built, options).filter((note) => note.durationMs >= options.minNoteMs);
}

/** Führt benachbarte Noten zusammen, die praktisch dieselbe Tonhöhe halten. */
function merge(notes: readonly Note[], options: Segmentation): Note[] {
  const merged: Note[] = [];

  for (const note of notes) {
    const previous = merged[merged.length - 1];
    const gap = previous ? note.startMs - (previous.startMs + previous.durationMs) : Infinity;

    const belongsTogether =
      previous !== undefined &&
      gap <= options.mergeGapMs &&
      Math.abs(note.midi - previous.midi) <= options.mergeToleranceSemitones;

    if (!previous || !belongsTogether) {
      merged.push({ ...note });
      continue;
    }

    // Längengewichtet: Die längere der beiden bestimmt die Tonhöhe stärker.
    const total = previous.durationMs + note.durationMs;
    previous.midi = (previous.midi * previous.durationMs + note.midi * note.durationMs) / total;
    previous.durationMs = note.startMs + note.durationMs - previous.startMs;
  }

  return merged;
}

function toPhrases(notes: readonly Note[], options: Segmentation): Phrase[] {
  const phrases: Phrase[] = [];

  for (const note of notes) {
    const current = phrases[phrases.length - 1];
    const gap = current ? note.startMs - current.endMs : Infinity;

    if (current && gap < options.phraseGapMs) {
      current.notes.push(note);
      current.endMs = note.startMs + note.durationMs;
      continue;
    }

    phrases.push({
      startMs: note.startMs,
      endMs: note.startMs + note.durationMs,
      notes: [note],
    });
  }

  return phrases;
}
