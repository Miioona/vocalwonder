"use client";

import {
  allNotes,
  chartDurationMs,
  foldToOctaveOf,
  midiRange,
  type Chart,
  type NoteScore,
} from "@vocalwonder/core";
import { useEffect, useRef } from "react";

import { readRendererColors } from "@/lib/player/renderer-colors";
import type { PitchPoint } from "@/lib/player/renderer";

interface PerformanceReviewProps {
  chart: Chart;
  /** Der ganze Durchgang, aufgezeichnet im 20-ms-Takt. */
  recording: readonly PitchPoint[];
  /** Ergebnis je Note, in derselben Reihenfolge wie im Chart. */
  noteScores: readonly NoteScore[];
}

/**
 * Der ganze Song auf einen Blick: Sollnoten und die eigene Linie darüber.
 *
 * Getroffene Noten heben sich ab, verfehlte bleiben blass — so sieht man auf einen Blick,
 * wo es hakte, statt nur eine Zahl zu bekommen.
 */
export const PerformanceReview = ({ chart, recording, noteScores }: PerformanceReviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const { width, height } = rect;
    const colors = readRendererColors(canvas);
    ctx.clearRect(0, 0, width, height);

    const durationMs = chartDurationMs(chart) || 1;
    const range = midiRange(chart);
    const low = (range?.min ?? 48) - 3;
    const high = (range?.max ?? 72) + 3;
    const middle = (low + high) / 2;

    const x = (timeMs: number) => (timeMs / durationMs) * width;
    const y = (midi: number) => {
      const clamped = Math.min(Math.max(midi, low), high);
      return height - ((clamped - low) / (high - low)) * height;
    };

    // Sollnoten zuerst, damit die eigene Linie darüber liegt.
    for (const [index, note] of allNotes(chart).entries()) {
      const hit = noteScores[index]?.ratio ?? 0;
      const left = x(note.startMs);
      const noteWidth = Math.max(2, x(note.startMs + note.durationMs) - left);

      ctx.fillStyle = hit >= 0.5 ? colors.noteActive : colors.note;
      ctx.globalAlpha = hit >= 0.5 ? 0.95 : 0.25;
      ctx.beginPath();
      ctx.roundRect(left, y(note.midi) - 3, noteWidth, 6, 3);
      ctx.fill();
    }

    // Die Aufzeichnung hat viel mehr Punkte als das Bild Pixel: 20-ms-Takt heißt 12.000
    // Werte für vier Minuten. Ungefiltert gezeichnet wird daraus ein Zickzack-Teppich.
    // Deshalb pro Pixelspalte der Median — das zeigt den Verlauf statt des Rauschens.
    const perColumn = new Map<number, number[]>();
    for (const point of recording) {
      // Oktave einfalten: Die Bewertung ist oktav-agnostisch, also gehört die Linie dorthin,
      // wo sie gemessen wurde — sonst klebt sie bei tiefen Stimmen am unteren Rand.
      const folded = foldToOctaveOf(point.midi, middle);
      const column = Math.round(x(point.timeMs));
      const values = perColumn.get(column);
      if (values) values.push(folded);
      else perColumn.set(column, [folded]);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.voice;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    let previousColumn: number | undefined;
    for (const column of [...perColumn.keys()].sort((a, b) => a - b)) {
      const values = perColumn.get(column)!.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)] ?? 0;

      // Lücke im Gesang: neu ansetzen statt quer durchs Bild ziehen.
      if (previousColumn === undefined || column - previousColumn > 3)
        ctx.moveTo(column, y(median));
      else ctx.lineTo(column, y(median));

      previousColumn = column;
    }
    ctx.stroke();
  }, [chart, recording, noteScores]);

  return <canvas ref={canvasRef} className="h-44 w-full rounded-md bg-background/40" />;
};
