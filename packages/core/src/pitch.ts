/** Conversions between frequency, MIDI note numbers and note names. */

export const A4_MIDI = 69;
export const A4_HZ = 440;

/** UltraStar pitch 0 corresponds to C4, i.e. MIDI note 60. */
export const ULTRASTAR_PITCH_ORIGIN_MIDI = 60;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Fractional MIDI note for a frequency. Returns NaN for non-positive input. */
export function hzToMidi(hz: number): number {
  if (hz <= 0) return Number.NaN;
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

/** Human-readable name such as "C4" or "F#3". */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12] ?? "?";
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

/**
 * Distance between two pitches in semitones, ignoring the octave — 0 to 6.
 *
 * This is how karaoke games score: a man singing an octave below the original
 * female vocal is still correct, so only the pitch class matters. Comparing
 * absolute MIDI numbers instead would punish every singer whose range differs
 * from the recording, which is most of them.
 */
export function pitchClassDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 12;
  return Math.min(diff, 12 - diff);
}

/**
 * Moves `midi` into the octave closest to `reference`, keeping its pitch class.
 * Used by the renderer to draw the singer's line next to the target bar instead
 * of off-screen when they sing in a different octave.
 */
export function foldToOctaveOf(midi: number, reference: number): number {
  if (!Number.isFinite(midi)) return midi;
  return midi + 12 * Math.round((reference - midi) / 12);
}
