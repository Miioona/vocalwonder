import type { Chart, Note, Phrase } from "@vocalwonder/core";

import { peakRms, type PitchCurve } from "./pitch-track";

/**
 * Aus der Tonhöhenkurve werden Balken.
 *
 * Das ist der Teil mit den Stellschrauben — die Kurve ist zappelig, die Balken sollen es
 * nicht sein. Alle Schwellen stehen als Konstanten oben, damit man sie beim Ausprobieren
 * schnell findet.
 */

/** Ungerade Fensterbreite für den Medianfilter (in Rahmen à 10 ms). */
const MEDIAN_WINDOW = 5;
/** Unter diesem Anteil der lautesten Stelle gilt der Rahmen als Pause. */
const SILENCE_RATIO = 0.06;
/** Kürzere Segmente sind Erkennungsfehler, keine gesungenen Töne. */
const MIN_NOTE_MS = 100;
/** Lücken darunter werden überbrückt, statt eine Note zu zerhacken (Konsonanten). */
const MAX_BRIDGE_MS = 60;
/**
 * Wie weit die Stimme vom Ton der laufenden Note abweichen darf, ohne dass eine neue
 * beginnt (in Halbtönen). Gesang liegt selten exakt auf dem Raster und schwankt um seinen
 * Zielton — ohne diese Toleranz zerfällt jede gehaltene Note in Dutzende Schnipsel.
 */
const PITCH_TOLERANCE = 0.7;
/**
 * So lange muss die Abweichung anhalten, bevor sie als neuer Ton gilt. Kürzeres ist ein
 * Übergang, ein Zischlaut oder ein Erkennungsfehler.
 */
const SWITCH_MS = 60;
/** Ab dieser Pause beginnt eine neue Phrase — das ist später eine Textzeile. */
const PHRASE_GAP_MS = 800;

export interface BuildOptions {
  title: string;
  artist: string;
}

export function buildChart(curve: PitchCurve, { title, artist }: BuildOptions): Chart {
  const smoothed = smooth(curve);
  const notes = toNotes(smoothed, curve.frameMs);

  return {
    title,
    artist,
    source: "analysis",
    phrases: toPhrases(notes),
    meta: {},
  };
}

/**
 * Medianfilter über die Halbtöne. Der Median ist hier richtig, nicht der Mittelwert:
 * Ein einzelner Ausreißer eine Oktave daneben zieht den Mittelwert mit, den Median nicht.
 */
function smooth(curve: PitchCurve): (number | undefined)[] {
  const silenceFloor = peakRms(curve) * SILENCE_RATIO;
  const half = Math.floor(MEDIAN_WINDOW / 2);

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
function toNotes(smoothed: (number | undefined)[], frameMs: number): Note[] {
  const switchFrames = Math.round(SWITCH_MS / frameMs);
  const bridgeFrames = Math.round(MAX_BRIDGE_MS / frameMs);

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

    if (Math.abs(value - current.center) <= PITCH_TOLERANCE) {
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

  return notes
    .map(({ startIndex, endIndex, values }): Note => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        startMs: startIndex * frameMs,
        // Der letzte Rahmen dauert selbst noch einen Rahmen lang an.
        durationMs: (endIndex - startIndex + 1) * frameMs,
        midi: sorted[Math.floor(sorted.length / 2)] ?? 0,
        text: "",
        type: "normal",
      };
    })
    .filter((note) => note.durationMs >= MIN_NOTE_MS);
}

function toPhrases(notes: readonly Note[]): Phrase[] {
  const phrases: Phrase[] = [];

  for (const note of notes) {
    const current = phrases[phrases.length - 1];
    const gap = current ? note.startMs - current.endMs : Infinity;

    if (current && gap < PHRASE_GAP_MS) {
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
