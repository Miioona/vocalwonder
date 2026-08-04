import type { PublicPlayer } from "./profile";

/**
 * Was über die offene Verbindung läuft — der Vertrag zwischen Backend und Browser.
 *
 * Hier statt auf beiden Seiten getrennt, damit ein umbenanntes Ereignis sofort auf beiden
 * Seiten auffällt und nicht erst im Betrieb.
 *
 * Anwesenheit fließt nur in eine Richtung: Wer verbunden ist, ist online — der Browser muss
 * dafür nichts melden. Gegenverkehr gibt es erst beim Duell.
 */
export const REALTIME_EVENTS = {
  /** Beim Verbinden: wer von meinen Freunden gerade da ist. */
  presenceSnapshot: "presence:snapshot",
  /** Danach nur noch Änderungen. */
  presenceChanged: "presence:changed",
  /** Jemand hat mir eine Freundschaftsanfrage geschickt. */
  friendRequest: "friend:request",
  /** Jemand hat meine Anfrage angenommen. */
  friendAccepted: "friend:accepted",
} as const;

export interface PresenceSnapshot {
  /** Nutzer-IDs der Freunde, die gerade verbunden sind. */
  online: string[];
}

export interface PresenceChanged {
  userId: string;
  online: boolean;
  /** Wann zuletzt gesehen — nur beim Wechsel auf offline gesetzt. */
  lastSeenAt?: string;
}

/** Ereignisse, die als Einblender erscheinen. Immer mit dem Menschen, um den es geht. */
export interface FriendEvent {
  player: PublicPlayer;
}

/** Was der Server schickt. Der Browser hört zu, mehr nicht. */
export interface ServerEvents {
  [REALTIME_EVENTS.presenceSnapshot]: (payload: PresenceSnapshot) => void;
  [REALTIME_EVENTS.presenceChanged]: (payload: PresenceChanged) => void;
  [REALTIME_EVENTS.friendRequest]: (payload: FriendEvent) => void;
  [REALTIME_EVENTS.friendAccepted]: (payload: FriendEvent) => void;
}

/** Noch leer — kommt mit den Duellen. */
export type ClientEvents = Record<string, never>;

/** Der Raum eines Nutzers. Ereignisse gehen an Räume, nie an einzelne Verbindungen: Wer die
 * App in zwei Tabs offen hat, soll sie in beiden bekommen. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
