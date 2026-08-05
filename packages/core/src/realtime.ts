import type { LobbyAck, LobbyInvite, LobbyMessage, LobbyState } from "./lobby";
import { LOBBY_EVENTS } from "./lobby";
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
  /** Client → Server: was ich gerade tue. */
  activity: "presence:activity",
} as const;

/**
 * Was jemand gerade tut.
 *
 * Zwei Quellen: "singt" weiß nur der Browser (die Musik läuft dort), "in einer Lobby" weiß
 * nur der Server. Der Server führt beides zusammen und hat dabei das letzte Wort — sonst
 * könnte man sich als "im Menü" ausgeben, während man in einer Runde sitzt.
 */
export type Activity =
  /** Startseite, Einstellungen — ansprechbar. */
  | "browsing"
  /** In der Songübersicht. Ebenfalls ansprechbar: Wer sucht, kann auch eingeladen werden. */
  | "library"
  | "singing"
  | "lobby";

export interface PresenceEntry {
  userId: string;
  activity: Activity;
}

export interface PresenceSnapshot {
  /** Freunde, die gerade verbunden sind — mit dem, was sie tun. */
  online: PresenceEntry[];
}

export interface PresenceChanged {
  userId: string;
  online: boolean;
  activity?: Activity;
  /** Wann zuletzt gesehen — nur beim Wechsel auf offline gesetzt. */
  lastSeenAt?: string;
}

/** Ereignisse, die als Einblender erscheinen. Immer mit dem Menschen, um den es geht. */
export interface FriendEvent {
  player: PublicPlayer;
}

/** Was der Server schickt. */
export interface ServerEvents {
  [REALTIME_EVENTS.presenceSnapshot]: (payload: PresenceSnapshot) => void;
  [REALTIME_EVENTS.presenceChanged]: (payload: PresenceChanged) => void;
  [REALTIME_EVENTS.friendRequest]: (payload: FriendEvent) => void;
  [REALTIME_EVENTS.friendAccepted]: (payload: FriendEvent) => void;

  [LOBBY_EVENTS.state]: (payload: LobbyState | null) => void;
  [LOBBY_EVENTS.invite]: (payload: LobbyInvite) => void;
  [LOBBY_EVENTS.declined]: (payload: { player: PublicPlayer }) => void;
  [LOBBY_EVENTS.messages]: (payload: LobbyMessage[]) => void;
  [LOBBY_EVENTS.message]: (payload: LobbyMessage) => void;
}

/**
 * Was der Browser schickt. Jeder Befehl bekommt eine Antwort — bei einer Absage steht der
 * Grund darin, damit die Oberfläche ihn zeigen kann, statt still nichts zu tun.
 */
export interface ClientEvents {
  [LOBBY_EVENTS.invitePlayer]: (userId: string, ack: LobbyAck) => void;
  [LOBBY_EVENTS.accept]: (code: string, ack: LobbyAck) => void;
  [LOBBY_EVENTS.decline]: (code: string, ack: LobbyAck) => void;
  [LOBBY_EVENTS.leave]: (ack: LobbyAck) => void;
  [LOBBY_EVENTS.send]: (text: string, ack: LobbyAck) => void;
  /** Was ich gerade tue — nur das, was der Server nicht selbst weiß. */
  [REALTIME_EVENTS.activity]: (activity: Activity) => void;
}

/** Der Raum eines Nutzers. Ereignisse gehen an Räume, nie an einzelne Verbindungen: Wer die
 * App in zwei Tabs offen hat, soll sie in beiden bekommen. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
