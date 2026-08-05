import type { PublicPlayer } from "./profile";

/**
 * Die Lobby — der Raum, in dem sich Leute vor einer Runde sammeln.
 *
 * Sie entsteht **mit der ersten Einladung**, nicht erst wenn jemand annimmt: Dann gibt es den
 * Code von Anfang an, und "spielt gerade nicht allein" ist keine Sonderregel, sondern schlicht
 * "sitzt in einer Lobby".
 */
export interface LobbyState {
  code: string;
  hostId: string;
  /** Wer drin sitzt, Gastgeber zuerst. */
  players: PublicPlayer[];
  /** Wer eingeladen ist und noch nicht geantwortet hat. */
  invited: PublicPlayer[];
}

export interface LobbyInvite {
  code: string;
  from: PublicPlayer;
}

export interface LobbyMessage {
  id: string;
  /**
   * "chat" kommt von einem Menschen, "system" von der Lobby selbst — Beitritte, Abgänge.
   * Systemzeilen tragen keinen Absender und werden zurückhaltender dargestellt.
   */
  kind: "chat" | "system";
  player?: PublicPlayer;
  text: string;
  /** ISO-Zeichenkette. */
  at: string;
}

/** Längere Nachrichten schneidet der Server ab — im Chat einer Spielrunde reicht das. */
export const LOBBY_MESSAGE_MAX = 300;
/** So viele Nachrichten hält eine Lobby vor; wer dazukommt, sieht sie. */
export const LOBBY_HISTORY = 50;

export const LOBBY_EVENTS = {
  /** Server → Client: der neue Stand. `null` heißt: nicht mehr in einer Lobby. */
  state: "lobby:state",
  /** Server → Client: jemand lädt mich ein. */
  invite: "lobby:invite",
  /** Server → Client: meine Einladung wurde abgelehnt. */
  declined: "lobby:declined",
  /** Server → Client: der bisherige Verlauf, beim Betreten. */
  messages: "lobby:messages",
  /** Server → Client: eine neue Nachricht. */
  message: "lobby:message",

  /** Client → Server. */
  invitePlayer: "lobby:invite-player",
  accept: "lobby:accept",
  decline: "lobby:decline",
  leave: "lobby:leave",
  send: "lobby:send",
} as const;

/** Antwort auf einen Befehl des Clients — der Grund steht im Klartext für die Oberfläche. */
export type LobbyAck = (result: { ok: boolean; message?: string }) => void;

/**
 * Sechs Zeichen, gut vorzulesen und abzutippen.
 *
 * Ohne `I`, `O`, `0` und `1` — die verwechselt man reihenweise. Bleiben 32 Zeichen, also rund
 * eine Milliarde Möglichkeiten; bei kurzlebigen Lobbys ist Erraten kein Thema.
 */
export const LOBBY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LOBBY_CODE_LENGTH = 6;
