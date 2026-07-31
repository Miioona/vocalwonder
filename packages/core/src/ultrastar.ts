/**
 * Parser for the UltraStar txt format — the de-facto standard for karaoke
 * charts, used by UltraStar Deluxe, Vocaluxe, Performous and the community
 * databases. Format reference: https://wiki.usdb.eu/txt_files/format
 *
 * A file looks roughly like this:
 *
 *   #TITLE:Song
 *   #ARTIST:Band
 *   #BPM:320
 *   #GAP:1200
 *   : 0 4 0 Hel
 *   : 4 4 2 lo
 *   - 8
 *   * 10 8 5 world
 *   E
 *
 * Note lines are `<type> <beat> <length> <pitch> <text>`, `-` breaks the
 * current line of lyrics and `E` ends the file.
 */

import type { Chart, ChartMeta, Note, NoteType, Phrase } from "./chart";
import { ULTRASTAR_PITCH_ORIGIN_MIDI } from "./pitch";

export class UltraStarParseError extends Error {
  readonly line: number | undefined;

  constructor(message: string, line?: number) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = "UltraStarParseError";
    this.line = line;
  }
}

const NOTE_TYPES: Record<string, NoteType> = {
  ":": "normal",
  "*": "golden",
  F: "freestyle",
  R: "rap",
  G: "rapGolden",
};

const HEADER_LINE = /^#([A-Za-z0-9_]+):(.*)$/;

function isSpace(char: string): boolean {
  return char === " " || char === "\t";
}

/**
 * Headers are written by tools from many locales, so decimals show up both as
 * "320.5" and "320,5".
 */
function parseDecimal(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number.parseFloat(raw.trim().replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

interface RawNote {
  type: NoteType;
  beat: number;
  length: number;
  pitch: number;
  text: string;
}

/**
 * Reads a note line by hand rather than by regex: the single space between
 * pitch and text is a separator, but any further spaces belong to the lyric and
 * carry the word boundaries. A regex with `\s+` would silently eat them.
 */
function readNoteLine(line: string): RawNote | undefined {
  const type = NOTE_TYPES[line.charAt(0)];
  if (type === undefined) return undefined;

  let pos = 1;
  const numbers: number[] = [];

  for (let n = 0; n < 3; n++) {
    while (pos < line.length && isSpace(line.charAt(pos))) pos++;

    const start = pos;
    if (line.charAt(pos) === "-") pos++;
    while (pos < line.length && line.charAt(pos) >= "0" && line.charAt(pos) <= "9") pos++;
    if (pos === start) return undefined;

    numbers.push(Number.parseInt(line.slice(start, pos), 10));
  }

  // Exactly one separator belongs to the format; the rest is lyric text.
  if (pos < line.length && isSpace(line.charAt(pos))) pos++;

  const [beat, length, pitch] = numbers;
  if (beat === undefined || length === undefined || pitch === undefined) return undefined;

  return { type, beat, length, pitch, text: line.slice(pos) };
}

type RawEntry = { kind: "note"; note: RawNote } | { kind: "break" };

export interface ParseUltraStarOptions {
  /**
   * Charts whose notes all sit at pitch 0 exist — they were tapped for rhythm
   * only. They parse fine but are useless as a singing target, so the caller
   * usually wants to know. Set to false to accept them silently.
   */
  rejectPitchlessCharts?: boolean;
}

export function parseUltraStar(source: string, options: ParseUltraStarOptions = {}): Chart {
  const { rejectPitchlessCharts = true } = options;

  const headers = new Map<string, string>();
  const entries: RawEntry[] = [];

  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = (lines[i] ?? "").replace(/\s+$/, "");
    const trimmed = line.trim();

    if (trimmed === "") continue;
    if (trimmed === "E") break;

    const header = HEADER_LINE.exec(trimmed);
    if (header) {
      const key = header[1];
      if (key !== undefined) headers.set(key.toUpperCase(), (header[2] ?? "").trim());
      continue;
    }

    if (trimmed.startsWith("-")) {
      entries.push({ kind: "break" });
      continue;
    }

    // P1/P2 mark the parts of a duet. Parsing them as a single voice would
    // interleave both singers into one nonsensical melody, so refuse instead.
    if (/^P\s*\d/.test(trimmed)) {
      throw new UltraStarParseError("duet charts (P1/P2) are not supported yet", lineNumber);
    }

    const note = readNoteLine(line);
    if (note === undefined) {
      throw new UltraStarParseError(`cannot read line: ${trimmed.slice(0, 40)}`, lineNumber);
    }

    entries.push({ kind: "note", note });
  }

  if (headers.get("RELATIVE")?.toLowerCase() === "yes") {
    throw new UltraStarParseError(
      "relative timing (#RELATIVE:yes) is not supported — convert the file first",
    );
  }

  const bpm = parseDecimal(headers.get("BPM"));
  if (bpm === undefined || bpm <= 0) {
    throw new UltraStarParseError("missing or invalid #BPM header");
  }

  const gapMs = parseDecimal(headers.get("GAP")) ?? 0;

  // UltraStar counts in quarter beats: one beat in the file is a quarter of a
  // BPM beat. Dropping the factor 4 makes every chart run at a quarter speed.
  const msPerBeat = 60_000 / (bpm * 4);
  const toMs = (beat: number): number => gapMs + beat * msPerBeat;

  const phrases: Phrase[] = [];
  let current: Note[] = [];

  const flush = (): void => {
    if (current.length === 0) return;
    const first = current[0];
    const last = current[current.length - 1];
    if (first === undefined || last === undefined) return;

    phrases.push({
      startMs: first.startMs,
      endMs: last.startMs + last.durationMs,
      notes: current,
    });
    current = [];
  };

  for (const entry of entries) {
    if (entry.kind === "break") {
      flush();
      continue;
    }

    const { note } = entry;
    current.push({
      startMs: toMs(note.beat),
      durationMs: note.length * msPerBeat,
      midi: note.pitch + ULTRASTAR_PITCH_ORIGIN_MIDI,
      text: note.text,
      type: note.type,
    });
  }
  flush();

  if (phrases.length === 0) {
    throw new UltraStarParseError("chart contains no notes");
  }

  if (rejectPitchlessCharts) {
    const pitches = new Set(phrases.flatMap((p) => p.notes.map((n) => n.midi)));
    if (pitches.size <= 1) {
      throw new UltraStarParseError("chart has no pitch information (all notes on one pitch)");
    }
  }

  const meta: ChartMeta = { bpm, gapMs };
  const language = headers.get("LANGUAGE");
  const genre = headers.get("GENRE");
  const year = parseDecimal(headers.get("YEAR"));
  // #MP3 is the historical name, #AUDIO the current one; files carry either.
  const audioFile = headers.get("AUDIO") ?? headers.get("MP3");
  const videoFile = headers.get("VIDEO");
  const coverFile = headers.get("COVER");

  if (language) meta.language = language;
  if (genre) meta.genre = genre;
  if (year !== undefined) meta.year = year;
  if (audioFile) meta.audioFile = audioFile;
  if (videoFile) meta.videoFile = videoFile;
  if (coverFile) meta.coverFile = coverFile;

  return {
    title: headers.get("TITLE") ?? "Unknown title",
    artist: headers.get("ARTIST") ?? "Unknown artist",
    source: "ultrastar",
    phrases,
    meta,
  };
}
