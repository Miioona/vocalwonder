/**
 * Vermittlung für die direkte Verbindung zwischen zwei Browsern.
 *
 * Der Ton läuft **nicht** über unseren Server, sondern direkt von einem zum anderen. Damit
 * die beiden sich finden, müssen sie vorher Steckbriefe austauschen — welche Adressen kommen
 * infrage, welche Formate spreche ich. Genau das läuft hier durch, ein paar Nachrichten je
 * Verbindung, einmalig.
 *
 * Der Server prüft nur, dass beide in derselben Lobby sitzen, und reicht weiter. Er liest den
 * Inhalt nicht und muss ihn auch nicht verstehen.
 */
export const RTC_EVENTS = {
  /** In beide Richtungen: an wen, und was. Der Server hängt beim Weiterreichen `from` an. */
  signal: "rtc:signal",
} as const;

export type RtcSignal =
  /**
   * "Ich bin bereit, ruf mich an."
   *
   * Ohne diese Meldung müsste der Besitzer raten, wann die Gegenseite zuhört — und ein zu
   * früh geschicktes Angebot ist verloren.
   */
  | { kind: "hello" }
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "candidate"; candidate: RtcCandidate };

/** Ein Verbindungsvorschlag des Browsers. Nachgebaut, damit `core` ohne DOM-Typen auskommt. */
export interface RtcCandidate {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface RtcSignalOut {
  to: string;
  signal: RtcSignal;
}

export interface RtcSignalIn {
  from: string;
  signal: RtcSignal;
}

/**
 * Öffentliche Adressauskunft.
 *
 * Reicht für die meisten Verbindungen. Wo sie nicht reicht — strenge Firmennetze, manche
 * Mobilfunknetze — bräuchte es zusätzlich ein Relais; das kommt später, falls es sich zeigt.
 */
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];
