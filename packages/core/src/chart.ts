/**
 * The chart data model — the notes behind the pitch bars.
 *
 * Everything is in absolute milliseconds relative to the start of the audio
 * file. UltraStar files store beats and need a BPM to be read; we convert on
 * import so that renderer, scoring and analysis never have to care about tempo.
 */

/** Note kinds, mirroring the line prefixes of the UltraStar txt format. */
export type NoteType =
  /** Ordinary note, scores normally. */
  | "normal"
  /** Golden note, scores double. */
  | "golden"
  /** Freestyle — displayed but not scored. */
  | "freestyle"
  /** Rap: only rhythm is scored, pitch is ignored. */
  | "rap"
  /** Rap note that scores double. */
  | "rapGolden";

export interface Note {
  startMs: number;
  durationMs: number;
  /**
   * MIDI note number, 60 = C4. Fractional values are allowed — analysis
   * produces them before quantisation, and scoring reads the raw pitch.
   */
  midi: number;
  /** Syllable sung on this note. Empty for charts generated without lyrics. */
  text: string;
  type: NoteType;
}

/**
 * A group of notes shown together — one line of lyrics. Phrases drive the
 * display: the renderer scrolls phrase by phrase rather than note by note.
 */
export interface Phrase {
  startMs: number;
  endMs: number;
  notes: Note[];
}

/** Where a chart's notes came from. Analysis results are the least reliable. */
export type ChartSource =
  /** Imported from an UltraStar txt file — hand-tapped, most accurate. */
  | "ultrastar"
  /** Produced by our own audio analysis pipeline. */
  | "analysis"
  /** Hand-edited in the app. */
  | "manual";

/** Optional metadata, mostly carried over from UltraStar headers. */
export interface ChartMeta {
  language?: string;
  year?: number;
  genre?: string;
  /** Filenames the chart references, relative to the chart file. */
  audioFile?: string;
  videoFile?: string;
  coverFile?: string;
  /** Original tempo and offset — kept so charts can be written back out. */
  bpm?: number;
  gapMs?: number;
}

export interface Chart {
  title: string;
  artist: string;
  source: ChartSource;
  phrases: Phrase[];
  meta: ChartMeta;
}

/** Every note of the chart in playback order. */
export function allNotes(chart: Chart): Note[] {
  return chart.phrases.flatMap((phrase) => phrase.notes);
}

/** End of the last note, or 0 for an empty chart. */
export function chartDurationMs(chart: Chart): number {
  let end = 0;
  for (const phrase of chart.phrases) {
    if (phrase.endMs > end) end = phrase.endMs;
  }
  return end;
}

/**
 * Lowest and highest note of the chart. The renderer uses this to decide which
 * pitch range to show, so the bars fill the screen instead of hugging one edge.
 */
export function midiRange(chart: Chart): { min: number; max: number } | undefined {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const phrase of chart.phrases) {
    for (const note of phrase.notes) {
      // Freestyle notes carry no meaningful pitch and would skew the range.
      if (note.type === "freestyle") continue;
      if (note.midi < min) min = note.midi;
      if (note.midi > max) max = note.midi;
    }
  }

  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : undefined;
}

/** The phrase being sung at `timeMs`, or the next one if we are in a gap. */
export function phraseAt(chart: Chart, timeMs: number): Phrase | undefined {
  return chart.phrases.find((phrase) => timeMs <= phrase.endMs);
}
