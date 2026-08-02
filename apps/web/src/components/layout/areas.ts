/**
 * Die Bereiche der App — geteilt zwischen Kopfzeile und Menüfeld, damit beide nicht
 * auseinanderlaufen.
 *
 * Gesperrtes steht sichtbar da, statt zu fehlen: Man soll sehen, was es gibt, und woran es
 * hängt. `ready` heißt "gibt es schon", `needsAccount` heißt "braucht eine Anmeldung".
 */
export const AREAS = [
  { href: "/songs", label: "Singleplayer", needsAccount: false, ready: true },
  { href: "/multiplayer", label: "Multiplayer", needsAccount: true, ready: false },
  { href: "/bestenliste", label: "Bestenliste", needsAccount: true, ready: false },
] as const;

export type Area = (typeof AREAS)[number];

/** Warum ein Bereich nicht anklickbar ist — oder `undefined`, wenn er es ist. */
export function lockReason(area: Area, signedIn: boolean): string | undefined {
  if (!area.ready) return "Kommt noch";
  if (area.needsAccount && !signedIn) return "Dafür brauchst du ein Konto";
  return undefined;
}
