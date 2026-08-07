import type { PublicPlayer } from "./profile";

/**
 * Die Lobby — der Raum, in dem sich Leute vor einer Runde sammeln.
 *
 * Sie entsteht **mit der ersten Einladung**, nicht erst wenn jemand annimmt: Dann gibt es den
 * Code von Anfang an, und "spielt gerade nicht allein" ist keine Sonderregel, sondern schlicht
 * "sitzt in einer Lobby".
 */
/**
 * Die Farben der Spieler.
 *
 * Vom Server vergeben, nicht vom Browser gewählt — sonst sähe dich einer türkis und der
 * andere orange. Bewusst weit auseinanderliegende Töne, und keiner davon nahe an den Farben
 * der Balken (`--note`, `--note-active`) oder der eigenen Stimme im Einzelspiel.
 */
export const LOBBY_COLORS = [
  "oklch(0.72 0.19 25)",
  "oklch(0.78 0.16 55)",
  "oklch(0.85 0.17 95)",
  "oklch(0.75 0.18 145)",
  "oklch(0.72 0.15 195)",
  "oklch(0.68 0.19 265)",
  "oklch(0.72 0.21 320)",
  "oklch(0.78 0.14 350)",
] as const;

export interface LobbyPlayer extends PublicPlayer {
  /** Seine Farbe für diese Lobby — in der Übersicht und später im Spiel. */
  color: string;
  /**
   * Ob gerade eine Verbindung steht.
   *
   * Ein Abbruch wirft niemanden sofort hinaus — dafür gibt es die Schonfrist. In der Lobby
   * soll er aber sichtbar sein, sonst rätseln die anderen, warum nichts vorangeht.
   */
  connected: boolean;
}

/**
 * Ein Song in der Warteschlange.
 *
 * Gespielt wird er von dem, der ihn eingestellt hat — bei ihm liegt die Datei. Titel, Länge
 * und ob ein Chart vorliegt, meldet sein Browser; die anderen haben ja keine Möglichkeit,
 * das nachzusehen.
 */
export interface QueuedSong {
  id: string;
  /** Hash der Datei beim Besitzer — damit Ergebnisse aller Beteiligten am selben Song hängen. */
  songHash: string;
  title: string;
  artist: string;
  durationMs: number;
  /** Ohne Chart gibt es nichts zu treffen. Gespielt werden darf trotzdem. */
  analysed: boolean;
  /** Fassung der Analysekette beim Besitzer — steht in den Ergebnissen aller Mitsingenden. */
  analysisVersion: number;
  /** Nutzer-ID des Besitzers. */
  addedBy: string;
}

export interface LobbyState {
  code: string;
  hostId: string;
  /** Wer drin sitzt, Gastgeber zuerst. */
  players: LobbyPlayer[];
  /** Wer eingeladen ist und noch nicht geantwortet hat. */
  invited: PublicPlayer[];
  /** Die Songs der Sitzung, in der Reihenfolge, in der sie gesungen werden. */
  queue: QueuedSong[];
  /** Wer bereit ist. Stellt jemand einen Song ein, fängt das von vorn an. */
  ready: string[];
  /**
   * Ab der ersten Runde steht die Liste fest.
   *
   * Nur der Abgang eines Spielers ändert sie danach noch — seine Songs gehen mit ihm.
   */
  locked: boolean;
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

/** Was der Browser beim Hinzufügen schickt. Die Kennung vergibt der Server. */
export type QueuedSongInput = Omit<QueuedSong, "id" | "addedBy">;

/** Der Punktestand eines Spielers im laufenden Song. */
export interface LobbyScore {
  userId: string;
  points: number;
  /** 0–1, der getroffene Anteil. */
  ratio: number;
}

/** Was am Ende eines Songs feststeht. */
export interface RoundResult {
  song: QueuedSong;
  /** Kennung der Runde — dieselbe in allen gespeicherten Ergebnissen. */
  roundId: string;
  /** Der gerade gesungene Song, nach Punkten absteigend. */
  scores: LobbyScore[];
  /** Alles seit Beginn der Sitzung, nach Punkten absteigend. */
  totals: LobbyScore[];
  /** Was als Nächstes drankommt — oder `null`, wenn die Liste leer ist. */
  next: QueuedSong | null;
}

export const LOBBY_EVENTS = {
  /** Server → Client: der neue Stand. `null` heißt: nicht mehr in einer Lobby. */
  state: "lobby:state",
  /** Server → Client: jemand lädt mich ein. */
  invite: "lobby:invite",
  /** Server → Client: meine Einladung wurde abgelehnt. */
  declined: "lobby:declined",
  /** Server → Client: die Runde beginnt, mit diesem Song. */
  start: "lobby:start",
  /** Server → Client: die Punktestände der laufenden Runde. */
  scores: "lobby:scores",
  /** Server → Client: der Song ist durch, hier das Ergebnis. */
  results: "lobby:results",
  /** Server → Client: der bisherige Verlauf, beim Betreten. */
  messages: "lobby:messages",
  /** Server → Client: eine neue Nachricht. */
  message: "lobby:message",

  /** Client → Server. */
  invitePlayer: "lobby:invite-player",
  addSong: "lobby:add-song",
  removeSong: "lobby:remove-song",
  /** Reihenfolge ändern — nur der Gastgeber. */
  moveSong: "lobby:move-song",
  /** Jemanden entfernen. Anwesende darf nur der Gastgeber. */
  kick: "lobby:kick",
  /** Bereit oder doch nicht. */
  ready: "lobby:ready",
  /** Mein Punktestand, während gesungen wird. */
  score: "lobby:score",
  /** Der Song ist durch — meldet nur, wem er gehört. */
  finished: "lobby:finished",
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
