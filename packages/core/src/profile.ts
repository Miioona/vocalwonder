/**
 * Der Spielername — der Name, unter dem man in Bestenlisten auftaucht und gefunden wird.
 *
 * Bewusst getrennt vom Namen bei Google oder Discord: Der ändert sich, wann immer der User
 * ihn dort ändert, und ist nicht eindeutig. Für Freundschaften und Bestenlisten brauchen wir
 * etwas Stabiles, das dem Konto gehört.
 */
export interface PlayerProfile {
  userId: string;
  playerName: string;
}

/** Wie ein anderer Spieler nach außen sichtbar ist. Nie mit E-Mail. */
export interface PublicPlayer {
  userId: string;
  playerName: string;
  image?: string;
}

export const PLAYER_NAME_MIN = 3;
export const PLAYER_NAME_MAX = 20;

/**
 * Erlaubt sind Buchstaben, Ziffern, Unterstrich und Bindestrich.
 *
 * Keine Leerzeichen und keine Sonderzeichen: Sonst lassen sich Namen bauen, die aussehen wie
 * ein anderer ("Fabian" mit kyrillischem а), und in einer Freundesliste ist das kein Spaß mehr.
 */
export const PLAYER_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** Schlüssel für Eindeutigkeit und Suche — Groß- und Kleinschreibung spielt keine Rolle. */
export function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}
