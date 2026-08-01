import { hzToMidi } from "@vocalwonder/core";
import { PitchDetector } from "pitchy";

import { SAMPLE_RATE } from "./separation";

/**
 * Tonhöhenverlauf des Gesangs-Stems: rahmenweise F0 plus Lautstärke.
 *
 * Läuft offline über die fertige Spur, nicht in Echtzeit — deshalb dürfen die Fenster
 * ruhig überlappen und der Algorithmus gründlich sein.
 *
 * Die rohe Kurve ist mehr als eine Zwischenstufe: Der spätere Schlauch-Modus liest genau
 * sie, ebenso eine feine Bewertung, und mit ihr lässt sich die Segmentierung mit anderen
 * Schwellen wiederholen, ohne erneut zu trennen. Sie wird deshalb mitgespeichert.
 *
 * **Spaltenweise statt zeilenweise:** drei typisierte Arrays statt 24.000 Objekten pro Song.
 * Etwa ein Viertel so groß, von IndexedDB binär abgelegt statt als Text, und später
 * unverändert an einen Server übertragbar.
 */

/** Abstand zweier Rahmen. Feiner braucht es für Noten nicht. */
export const FRAME_MS = 10;
const HOP = (SAMPLE_RATE * FRAME_MS) / 1000;

/** Die Stellschrauben der Tonhöhenerkennung. */
export interface PitchOptions {
  /**
   * Ab welcher Eindeutigkeit ein Rahmen als Ton zählt (0–1). Zu hoch heißt: Die Stimme
   * wird streckenweise gar nicht erkannt, und die Segmentierung sieht dort nichts.
   */
  minClarity: number;
  /** Fensterbreite in Samples. Größer stabilisiert tiefe Stimmen, verschmiert schnelle Silben. */
  windowSize: number;
  minHz: number;
  maxHz: number;
}

export const DEFAULT_PITCH_OPTIONS: PitchOptions = {
  minClarity: 0.55,
  windowSize: 2048,
  minHz: 65,
  // A5 (880 Hz) ist schon eine hohe Belt-Note. Was darüber auftaucht, sind fast immer
  // Oktavverdopplungen — die Erkennung greift dann die erste Oberschwingung.
  maxHz: 900,
};

export interface PitchCurve {
  /** Abstand zweier Rahmen in Millisekunden. */
  frameMs: number;
  /** MIDI-Tonhöhe je Rahmen, `NaN` wo nichts Verwertbares erkannt wurde. */
  midi: Float32Array;
  /** 0–1, wie eindeutig der Ton war. */
  clarity: Float32Array;
  /** Effektivwert des Fensters — trennt Gesang von Stille und Atem. */
  rms: Float32Array;
}

export function trackPitch(stem: Float32Array[], options: Partial<PitchOptions> = {}): PitchCurve {
  const { minClarity, windowSize, minHz, maxHz } = { ...DEFAULT_PITCH_OPTIONS, ...options };

  const mono = toMono(stem);
  const detector = PitchDetector.forFloat32Array(windowSize);
  detector.clarityThreshold = minClarity;

  const count = Math.max(0, Math.floor((mono.length - windowSize) / HOP) + 1);
  const midi = new Float32Array(count);
  const clarity = new Float32Array(count);
  const rms = new Float32Array(count);
  const window = new Float32Array(windowSize);

  for (let index = 0; index < count; index += 1) {
    const start = index * HOP;
    window.set(mono.subarray(start, start + windowSize));

    let sumOfSquares = 0;
    for (const value of window) sumOfSquares += value * value;

    const [hz, frameClarity] = detector.findPitch(window, SAMPLE_RATE);
    const usable = frameClarity >= minClarity && hz >= minHz && hz <= maxHz;

    midi[index] = usable ? hzToMidi(hz) : Number.NaN;
    clarity[index] = frameClarity;
    rms[index] = Math.sqrt(sumOfSquares / windowSize);
  }

  return { frameMs: FRAME_MS, midi, clarity, rms };
}

/** Zeitpunkt eines Rahmens in Millisekunden. */
export function frameTimeMs(curve: PitchCurve, index: number): number {
  return index * curve.frameMs;
}

/** Lauteste Stelle der Spur — Bezugspunkt für die Stille-Schwelle. */
export function peakRms(curve: PitchCurve): number {
  let peak = 0;
  for (const value of curve.rms) if (value > peak) peak = value;
  return peak;
}

function toMono(channels: Float32Array[]): Float32Array {
  const [left, right] = channels;
  if (!left) return new Float32Array();
  if (!right) return left;

  const mono = new Float32Array(left.length);
  for (let i = 0; i < left.length; i += 1) {
    mono[i] = ((left[i] ?? 0) + (right[i] ?? 0)) / 2;
  }
  return mono;
}
