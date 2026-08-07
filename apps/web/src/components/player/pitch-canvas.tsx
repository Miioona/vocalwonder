"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";

import { allNotes, midiRange, type Chart, type Note } from "@vocalwonder/core";

import { DEFAULT_MIDI_HIGH, DEFAULT_MIDI_LOW, drawTimeline } from "@/lib/player/renderer";
import type { Performance } from "@/lib/player/use-performance";
import { readRendererColors } from "@/lib/player/renderer-colors";

/**
 * Das Spielfeld. Die Schleife holt sich Zeit und Tonhöhe **direkt** aus Engine und
 * Mikrofon, nicht aus React — sonst würde jeder Frame einen Re-Render auslösen. Deshalb
 * hat diese Komponente auch keinen State.
 */
/**
 * Woher die Position im Song kommt.
 *
 * Beim Alleinsingen ist das die Wiedergabe auf diesem Rechner. Im Mehrspieler meldet sie der
 * Besitzer des Songs — dort liegt die Datei, dort läuft die Uhr. Das Spielfeld muss den
 * Unterschied nicht kennen.
 */
export interface Clock {
  positionMs: () => number;
}

export const PitchCanvas = ({
  clock,
  performance,
  chart,
}: {
  clock: Clock;
  /** Gesungene Linie und Bewertung; wird pro Frame gelesen, nie über React. */
  performance: RefObject<Performance>;
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

    let frame = requestAnimationFrame(function loop() {
      const positionMs = clock.positionMs();
      const trail = performance.current.trail;
      const hits = performance.current.scorer?.ratios();

      drawTimeline(ctx, {
        width,
        height,
        positionMs,
        trail,
        notes,
        hits,
        midiLow,
        midiHigh,
        colors,
      });
      frame = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      themeObserver.disconnect();
    };
  }, [clock, performance, notes, midiLow, midiHigh]);

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
