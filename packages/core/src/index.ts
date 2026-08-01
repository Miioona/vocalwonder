/**
 * Shared domain code for the VocalWonder apps.
 *
 * Consumed by `apps/web` (browser analysis, renderer, scoring) and `apps/api`
 * (chart import). Keep this package dependency-free and platform-agnostic — no
 * Node built-ins, no DOM APIs — so it runs in both.
 *
 * Internal imports are written without a file extension, unlike in `apps/api`.
 * This package ships TypeScript source that Next.js bundles via
 * `transpilePackages`, and Turbopack does not map a `.js` specifier back onto
 * the `.ts` file it came from.
 */

export type { ApiError, ApiResponse, HealthStatus } from "./api";

export type { Chart, ChartMeta, ChartSource, Note, NoteType, Phrase } from "./chart";
export { allNotes, chartDurationMs, midiRange, phraseAt } from "./chart";

export {
  A4_HZ,
  A4_MIDI,
  ULTRASTAR_PITCH_ORIGIN_MIDI,
  foldToOctaveOf,
  hzToMidi,
  midiToHz,
  midiToNoteName,
  pitchClassDistance,
} from "./pitch";

export type { SongScore, SongScoreInput } from "./scores";

export type { NoteScore, ScoreSettings, ScoreSnapshot, Scorer } from "./scoring";
export { DEFAULT_SCORE_SETTINGS, MAX_POINTS, createScorer } from "./scoring";

export type { ParseUltraStarOptions } from "./ultrastar";
export { UltraStarParseError, parseUltraStar } from "./ultrastar";
