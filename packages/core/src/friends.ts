/**
 * Freundschaften: eine Anfrage, die angenommen wird — bewusst gegenseitig.
 *
 * Kein Folgen wie bei Twitter: Wer in meiner Bestenliste auftaucht, soll dem zugestimmt haben.
 */

/** Wie ich zu einem anderen Spieler stehe. Immer aus meiner Sicht. */
export type FriendStatus =
  | "none"
  /** Ich habe angefragt, es fehlt seine Antwort. */
  | "outgoing"
  /** Er hat angefragt, ich muss antworten. */
  | "incoming"
  | "friends";

export interface FriendEntry {
  userId: string;
  playerName: string;
  image?: string;
  status: FriendStatus;
  /** Wann angefragt bzw. angenommen wurde. */
  since: string;
}

/** Ergebnis der Suche — dieselben Angaben, plus der aktuelle Stand zwischen uns beiden. */
export interface PlayerSearchResult {
  userId: string;
  playerName: string;
  image?: string;
  status: FriendStatus;
}

export interface FriendList {
  friends: FriendEntry[];
  /** Anfragen an mich, die auf Antwort warten. */
  incoming: FriendEntry[];
  /** Meine Anfragen, die noch offen sind. */
  outgoing: FriendEntry[];
}
