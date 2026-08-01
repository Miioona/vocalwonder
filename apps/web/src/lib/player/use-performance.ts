"use client";

import { createScorer, type Chart, type ScoreSnapshot, type Scorer } from "@vocalwonder/core";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";
import type { AudioEngine } from "./audio-engine";
import type { Microphone } from "./microphone";
import type { PitchPoint } from "./renderer";

/**
 * Nimmt den Gesang auf und bewertet ihn.
 *
 * **Fester Takt statt Bildrate:** Auf einem 120-Hz-Schirm gäbe es sonst doppelt so viele
 * Messpunkte wie auf einem 60-Hz-Schirm — und damit ein anderes Ergebnis für denselben
 * Gesang. Deshalb ein eigener Taktgeber, unabhängig vom Zeichnen.
 */
const STEP_MS = 20;
/** So weit reicht die sichtbare Linie zurück; die Aufzeichnung behält alles. */
const TRAIL_LENGTH_MS = 8000;
/** Wie oft die Anzeige den Punktestand abholt. 60-mal pro Sekunde wäre sinnlos. */
const SNAPSHOT_EVERY = 10;

/**
 * Glättung der Tonhöhe. Kleine Schwankungen (Vibrato, Erkennungsrauschen) werden gedämpft,
 * echte Sprünge übernimmt der Wert direkt — sonst würde die Linie hinterherschleichen.
 */
const SMOOTHING = 0.4;
const JUMP_SEMITONES = 2.5;

export interface Performance {
  /** Die letzten Sekunden, vom Renderer pro Frame gelesen. */
  trail: PitchPoint[];
  /** Der ganze Durchgang — Grundlage für die Nachschau nach dem Song. */
  recording: PitchPoint[];
  scorer?: Scorer;
}

export const usePerformance = (
  engine: AudioEngine,
  microphone: Microphone | undefined,
  chart: Chart | undefined,
  active: boolean,
) => {
  const scorer = useMemo(() => (chart ? createScorer(chart) : undefined), [chart]);
  const performance = useRef<Performance>({ trail: [], recording: [], scorer });

  // Über das Anhalten hinweg gemerkt: Beim Pausieren stoppt die Messung, beim Neustart
  // springt die Position zurück. Lägen diese Werte im Effekt, wäre der Rücksprung nach einer
  // Pause nicht mehr erkennbar — und die alte Linie bliebe stehen.
  const lastPositionMs = useRef(0);
  const smoothed = useRef<number>(undefined);
  const [snapshot, setSnapshot] = useState<ScoreSnapshot>();

  useEffect(() => {
    if (!active || !microphone) return;

    const state = performance.current;
    state.scorer = scorer;

    let ticks = 0;

    const timer = window.setInterval(() => {
      // Derselbe Ausgleich wie bei der Anzeige: Was jetzt ankommt, war früher gemeint.
      const positionMs = engine.positionMs() - useSettingsStore.getState().latencyMs;

      // Sprung zurück (Neustart, Spulen): alles Bisherige verwerfen.
      if (positionMs < lastPositionMs.current) {
        state.trail.length = 0;
        state.recording.length = 0;
        state.scorer?.reset();
        smoothed.current = undefined;
        setSnapshot(state.scorer?.snapshot());
      }
      lastPositionMs.current = positionMs;

      const sample = microphone.read();

      if (sample.midi === undefined) {
        smoothed.current = undefined;
      } else {
        const previous = smoothed.current;
        smoothed.current =
          previous === undefined || Math.abs(sample.midi - previous) > JUMP_SEMITONES
            ? sample.midi
            : previous + (sample.midi - previous) * SMOOTHING;

        const point = { timeMs: positionMs, midi: smoothed.current };
        state.trail.push(point);
        state.recording.push(point);
      }

      state.scorer?.feed(positionMs, smoothed.current, STEP_MS);

      while (
        state.trail.length > 0 &&
        (state.trail[0]?.timeMs ?? 0) < positionMs - TRAIL_LENGTH_MS
      ) {
        state.trail.shift();
      }

      ticks += 1;
      if (ticks % SNAPSHOT_EVERY === 0) setSnapshot(state.scorer?.snapshot());
    }, STEP_MS);

    return () => window.clearInterval(timer);
  }, [engine, microphone, scorer, active]);

  return { performance, snapshot };
};
