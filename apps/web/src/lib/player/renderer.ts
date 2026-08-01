import { midiToNoteName, type Note } from "@vocalwonder/core";

import type { RendererColors } from "./renderer-colors";

/**
 * Zeichnet einen Frame des Spielfelds. Reines Canvas, kein React — der Renderer wird 60-mal
 * pro Sekunde aufgerufen und darf nichts anfassen, was einen Re-Render auslösen könnte.
 *
 * Zeitraster, Sollnoten aus dem Chart, die eigene gesungene Linie und der Playhead.
 */

/** Wie schnell die Zeitachse durchläuft. Später aus den Spieleinstellungen. */
const PIXELS_PER_SECOND = 120;
/** Der Playhead steht fest — die Zeit läuft auf ihn zu, nicht er über sie. */
const PLAYHEAD_RATIO = 1 / 3;

/** Sichtbarer Tonumfang ohne Chart: A2 bis A5 deckt Männer- und Frauenstimmen ab. */
export const DEFAULT_MIDI_LOW = 45;
export const DEFAULT_MIDI_HIGH = 81;

/** Dicke eines Notenbalkens in Pixeln. */
const NOTE_HEIGHT = 12;

/** Größere Lücke = Atempause: Dann wird die Linie unterbrochen statt durchgezogen. */
const TRAIL_GAP_MS = 140;

export interface PitchPoint {
  timeMs: number;
  midi: number;
}

export interface TimelineFrame {
  /** Größe in CSS-Pixeln (nicht Gerätepixeln — die Skalierung macht der Aufrufer). */
  width: number;
  height: number;
  positionMs: number;
  /** Die zuletzt gesungenen Tonhöhen, aufsteigend nach Zeit. */
  trail?: readonly PitchPoint[];
  /** Sollnoten aus dem Chart, nach Startzeit sortiert. */
  notes?: readonly Note[];
  /** Sichtbarer Tonumfang — beim Chart aus dessen Umfang, sonst der Standard. */
  midiLow: number;
  midiHigh: number;
  /** Aus den CSS-Variablen gelesen, siehe `renderer-colors.ts`. */
  colors: RendererColors;
}

export function drawTimeline(ctx: CanvasRenderingContext2D, frame: TimelineFrame): void {
  const { width, height } = frame;

  ctx.clearRect(0, 0, width, height);
  if (width === 0 || height === 0) return;

  const pixelsPerMs = PIXELS_PER_SECOND / 1000;
  const playheadX = Math.round(width * PLAYHEAD_RATIO);

  drawOctaves(ctx, frame);
  drawSeconds(ctx, frame, pixelsPerMs, playheadX);
  drawNotes(ctx, frame, pixelsPerMs, playheadX);
  drawTrail(ctx, frame, pixelsPerMs, playheadX);
  drawPlayhead(ctx, height, playheadX, frame.colors);
}

/** Bildet eine MIDI-Note auf eine Höhe ab — oben hoch, unten tief. */
function midiToY(midi: number, { height, midiLow, midiHigh }: TimelineFrame): number {
  const clamped = Math.min(Math.max(midi, midiLow), midiHigh);
  return height - ((clamped - midiLow) / (midiHigh - midiLow)) * height;
}

function drawOctaves(ctx: CanvasRenderingContext2D, frame: TimelineFrame): void {
  const { width, midiLow, midiHigh } = frame;
  ctx.lineWidth = 1;
  ctx.font = "10px ui-monospace, monospace";
  ctx.textBaseline = "middle";

  // Jedes C bekommt eine Linie — das gibt der Höhe eine Bedeutung, statt nur Streifen.
  const firstC = Math.ceil(midiLow / 12) * 12;
  for (let midi = firstC; midi <= midiHigh; midi += 12) {
    const y = Math.round(midiToY(midi, frame)) + 0.5;

    ctx.strokeStyle = frame.colors.grid;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = frame.colors.grid;
    ctx.fillText(midiToNoteName(midi), 6, y - 8);
    ctx.globalAlpha = 1;
  }
}

function drawSeconds(
  ctx: CanvasRenderingContext2D,
  frame: TimelineFrame,
  pixelsPerMs: number,
  playheadX: number,
): void {
  const { width, height, positionMs } = frame;

  // Nur den sichtbaren Ausschnitt zeichnen, nicht den ganzen Song.
  const firstSecond = Math.floor((positionMs - playheadX / pixelsPerMs) / 1000);
  const lastSecond = Math.ceil((positionMs + (width - playheadX) / pixelsPerMs) / 1000);

  ctx.font = "11px ui-monospace, monospace";
  ctx.textBaseline = "top";

  for (let second = Math.max(firstSecond, 0); second <= lastSecond; second += 1) {
    const x = Math.round(playheadX + (second * 1000 - positionMs) * pixelsPerMs) + 0.5;
    const emphasized = second % 5 === 0;

    ctx.strokeStyle = frame.colors.grid;
    ctx.globalAlpha = emphasized ? 0.28 : 0.1;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    if (emphasized) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = frame.colors.grid;
      ctx.fillText(label(second), x + 4, 6);
    }
    ctx.globalAlpha = 1;
  }
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  frame: TimelineFrame,
  pixelsPerMs: number,
  playheadX: number,
): void {
  const { positionMs, trail } = frame;
  if (!trail || trail.length === 0) return;

  ctx.strokeStyle = frame.colors.voice;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.beginPath();
  let previous: PitchPoint | undefined;

  for (const point of trail) {
    const x = playheadX + (point.timeMs - positionMs) * pixelsPerMs;
    const y = midiToY(point.midi, frame);

    // Nach einer Pause neu ansetzen, sonst zieht die Linie quer durchs Bild.
    if (!previous || point.timeMs - previous.timeMs > TRAIL_GAP_MS) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    previous = point;
  }

  ctx.stroke();

  // Der aktuelle Ton als Punkt auf dem Playhead — das Auge braucht einen Anker.
  const last = trail[trail.length - 1];
  if (last && positionMs - last.timeMs < TRAIL_GAP_MS) {
    ctx.fillStyle = frame.colors.voice;
    ctx.beginPath();
    ctx.arc(playheadX, midiToY(last.midi, frame), 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Die Sollnoten. Sie laufen von rechts auf den Playhead zu; die Note, die gerade dran ist,
 * hebt sich ab — sonst weiß man beim Singen nicht, welcher Balken gemeint ist.
 */
function drawNotes(
  ctx: CanvasRenderingContext2D,
  frame: TimelineFrame,
  pixelsPerMs: number,
  playheadX: number,
): void {
  const { width, positionMs, notes } = frame;
  if (!notes || notes.length === 0) return;

  // Nur den sichtbaren Ausschnitt zeichnen — ein Chart hat schnell mehrere hundert Noten.
  const fromMs = positionMs - playheadX / pixelsPerMs;
  const toMs = positionMs + (width - playheadX) / pixelsPerMs;

  for (const note of notes) {
    const endMs = note.startMs + note.durationMs;
    if (endMs < fromMs) continue;
    if (note.startMs > toMs) break;

    const x = playheadX + (note.startMs - positionMs) * pixelsPerMs;
    const noteWidth = Math.max(3, note.durationMs * pixelsPerMs);
    const y = midiToY(note.midi, frame) - NOTE_HEIGHT / 2;

    const active = positionMs >= note.startMs && positionMs <= endMs;
    ctx.fillStyle = active ? frame.colors.noteActive : frame.colors.note;
    ctx.globalAlpha = active ? 1 : 0.35;

    ctx.beginPath();
    ctx.roundRect(x, y, noteWidth, NOTE_HEIGHT, NOTE_HEIGHT / 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  height: number,
  playheadX: number,
  colors: RendererColors,
): void {
  const x = playheadX + 0.5;

  ctx.strokeStyle = colors.playhead;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function label(second: number): string {
  const minutes = Math.floor(second / 60);
  const seconds = second % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
