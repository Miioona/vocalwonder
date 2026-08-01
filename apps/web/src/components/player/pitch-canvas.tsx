"use client";

import { useEffect, useMemo, useRef } from "react";

import { allNotes, midiRange, type Chart, type Note } from "@vocalwonder/core";

import type { AudioEngine } from "@/lib/player/audio-engine";
import type { Microphone } from "@/lib/player/microphone";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  DEFAULT_MIDI_HIGH,
  DEFAULT_MIDI_LOW,
  drawTimeline,
  type PitchPoint,
} from "@/lib/player/renderer";
import { readRendererColors } from "@/lib/player/renderer-colors";

/** So weit reicht die gesungene Linie zurück — mehr ist links vom Bild sowieso weg. */
const TRAIL_LENGTH_MS = 8000;
/**
 * Glättung der Tonhöhe. Kleine Schwankungen (Vibrato, Erkennungsrauschen) werden gedämpft,
 * echte Sprünge übernimmt der Wert direkt — sonst würde die Linie hinterherschleichen.
 */
const SMOOTHING = 0.4;
const JUMP_SEMITONES = 2.5;

/**
 * Das Spielfeld. Die Schleife holt sich Zeit und Tonhöhe **direkt** aus Engine und
 * Mikrofon, nicht aus React — sonst würde jeder Frame einen Re-Render auslösen. Deshalb
 * hat diese Komponente auch keinen State.
 */
export const PitchCanvas = ({
  engine,
  microphone,
  chart,
}: {
  engine: AudioEngine;
  microphone?: Microphone;
  chart?: Chart;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Noten und Tonumfang hängen nur am Chart — einmal rechnen, nicht pro Frame.
  const { notes, midiLow, midiHigh } = useMemo(() => view(chart), [chart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Auf Retina-Schirmen hat ein CSS-Pixel mehrere Gerätepixel. Ohne diese Skalierung
      // sieht alles matschig aus.
      const ratio = window.devicePixelRatio || 1;

      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Die Farben kommen aus den CSS-Variablen. Einmal lesen, nicht pro Frame —
    // `getComputedStyle` erzwingt sonst 60-mal pro Sekunde ein Neuberechnen des Layouts.
    let colors = readRendererColors(canvas);
    const rereadColors = () => {
      colors = readRendererColors(canvas);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    // Beim Themewechsel ändert sich die Klasse am Dokument — dann gelten andere Farben.
    const themeObserver = new MutationObserver(rereadColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    const trail: PitchPoint[] = [];
    let smoothed: number | undefined;
    let lastPositionMs = 0;

    let frame = requestAnimationFrame(function loop() {
      const positionMs = engine.positionMs();

      // Sprung zurück (Neustart, Spulen): alte Linie verwerfen.
      if (positionMs < lastPositionMs) {
        trail.length = 0;
        smoothed = undefined;
      }
      lastPositionMs = positionMs;

      const sample = microphone?.read();

      if (sample?.midi === undefined) {
        smoothed = undefined;
      } else if (engine.isPlaying) {
        smoothed =
          smoothed === undefined || Math.abs(sample.midi - smoothed) > JUMP_SEMITONES
            ? sample.midi
            : smoothed + (sample.midi - smoothed) * SMOOTHING;

        // Der Latenzausgleich verschiebt die eigene Stimme dorthin, wo sie gesungen wurde:
        // Was jetzt ankommt, war um `latencyMs` früher gemeint. Direkt aus dem Store gelesen,
        // damit ein Zug am Regler sofort sichtbar wird — pro Frame ein Feldzugriff.
        const latencyMs = useSettingsStore.getState().latencyMs;
        trail.push({ timeMs: positionMs - latencyMs, midi: smoothed });
      }

      while (trail.length > 0 && trail[0].timeMs < positionMs - TRAIL_LENGTH_MS) trail.shift();

      drawTimeline(ctx, { width, height, positionMs, trail, notes, midiLow, midiHigh, colors });
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
    };
  }, [engine, microphone, notes, midiLow, midiHigh]);

  return <canvas ref={canvasRef} className="size-full" />;
};

/**
 * Sichtbarer Ausschnitt für einen Chart: sein Tonumfang plus Luft nach oben und unten,
 * mindestens aber eine Oktave — sonst wirken die Balken bei ruhigen Songs riesig.
 */
function view(chart?: Chart): { notes?: Note[]; midiLow: number; midiHigh: number } {
  if (!chart) return { midiLow: DEFAULT_MIDI_LOW, midiHigh: DEFAULT_MIDI_HIGH };

  const range = midiRange(chart);
  if (!range) return { notes: [], midiLow: DEFAULT_MIDI_LOW, midiHigh: DEFAULT_MIDI_HIGH };

  const padding = 3;
  let low = Math.floor(range.min) - padding;
  let high = Math.ceil(range.max) + padding;

  const minimumSpan = 12;
  if (high - low < minimumSpan) {
    const missing = (minimumSpan - (high - low)) / 2;
    low -= missing;
    high += missing;
  }

  return { notes: allNotes(chart), midiLow: low, midiHigh: high };
}
