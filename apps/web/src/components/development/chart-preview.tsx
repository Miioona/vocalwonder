"use client";

import { allNotes, midiRange, type Chart } from "@vocalwonder/core";
import { useEffect, useRef } from "react";

import { frameTimeMs, type PitchCurve } from "@/lib/analysis/pitch-track";

/**
 * Rohe Tonhöhenkurve und die daraus gebauten Balken übereinander. Genau dieser Vergleich
 * beantwortet die Frage, ob die Segmentierung taugt: Liegen die Balken auf der Kurve, oder
 * zerfällt alles in Konfetti?
 */
export const ChartPreview = ({
  chart,
  curve,
  durationMs,
  positionMs,
}: {
  chart: Chart;
  curve: PitchCurve;
  durationMs: number;
  /** Läuft beim Anhören mit. Wird direkt ins DOM geschrieben, nicht über React-State. */
  positionMs?: () => number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!positionMs) return;

    let frame = requestAnimationFrame(function loop() {
      const playhead = playheadRef.current;
      if (playhead) {
        const ratio = Math.min(1, positionMs() / durationMs);
        playhead.style.left = `${ratio * 100}%`;
        playhead.style.opacity = ratio >= 1 ? "0" : "1";
      }
      frame = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(frame);
  }, [positionMs, durationMs]);

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
    ctx.clearRect(0, 0, width, height);

    const range = midiRange(chart);
    // Etwas Luft nach oben und unten, sonst kleben Balken am Rand.
    const low = (range?.min ?? 48) - 2;
    const high = (range?.max ?? 72) + 2;

    const x = (timeMs: number) => (timeMs / durationMs) * width;
    const y = (midi: number) => height - ((midi - low) / (high - low)) * height;

    // Erst die Kurve, damit die Balken darüber liegen.
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    let pen = false;
    for (const [index, midi] of curve.midi.entries()) {
      if (Number.isNaN(midi)) {
        pen = false;
        continue;
      }
      const px = x(frameTimeMs(curve, index));
      const py = y(midi);
      if (pen) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      pen = true;
    }
    ctx.stroke();

    ctx.fillStyle = "rgb(52, 211, 153)";
    for (const note of allNotes(chart)) {
      const left = x(note.startMs);
      const noteWidth = Math.max(1, x(note.startMs + note.durationMs) - left);
      ctx.fillRect(left, y(note.midi) - 2, noteWidth, 4);
    }
  }, [chart, curve, durationMs]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="h-48 w-full rounded-md bg-neutral-900/60" />
      {positionMs && (
        <div
          ref={playheadRef}
          className="pointer-events-none absolute inset-y-0 w-px bg-white/70"
          style={{ left: 0 }}
        />
      )}
    </div>
  );
};
