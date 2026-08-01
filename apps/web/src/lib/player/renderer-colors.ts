/**
 * Die Farben des Spielfelds, aus den CSS-Variablen gelesen.
 *
 * Ein Canvas erbt kein CSS: Klassen und Variablen wirken dort nicht, `fillStyle` will einen
 * fertigen Farbwert. Also lesen wir die Tokens einmal aus dem Dokument und geben sie dem
 * Renderer mit — sonst bliebe das Spielfeld grau, während der Rest der App sein Theme
 * wechselt.
 *
 * Gelesen wird beim Aufbau, bei Größenänderungen und beim Themewechsel — **nicht** pro
 * Frame: `getComputedStyle` erzwingt ein Neuberechnen des Layouts.
 */
export interface RendererColors {
  note: string;
  noteActive: string;
  voice: string;
  grid: string;
  playhead: string;
}

const FALLBACK: RendererColors = {
  note: "oklch(0.78 0.03 300)",
  noteActive: "oklch(0.85 0.16 95)",
  voice: "oklch(0.79 0.16 160)",
  grid: "oklch(0.72 0.02 300)",
  playhead: "oklch(0.98 0 0)",
};

export function readRendererColors(element: Element): RendererColors {
  if (typeof window === "undefined") return FALLBACK;

  const styles = getComputedStyle(element);
  const read = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback;

  return {
    note: read("--note", FALLBACK.note),
    noteActive: read("--note-active", FALLBACK.noteActive),
    voice: read("--voice", FALLBACK.voice),
    grid: read("--grid", FALLBACK.grid),
    playhead: read("--playhead", FALLBACK.playhead),
  };
}
