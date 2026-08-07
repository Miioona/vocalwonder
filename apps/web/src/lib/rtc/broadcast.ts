"use client";

import { ICE_SERVERS, RTC_EVENTS } from "@vocalwonder/core";
import type { Chart, RtcCandidate, RtcSignal } from "@vocalwonder/core";

import { getSocket } from "@/lib/realtime/socket";

/**
 * Die Tonübertragung an die Mitspieler.
 *
 * Der Ton geht **direkt** von Browser zu Browser, nicht über unseren Server. Der vermittelt
 * nur den Verbindungsaufbau — danach ist er raus, egal wie lange gesungen wird.
 *
 * Wer den Song besitzt, ruft an (`Broadcaster`); die anderen nehmen ab (`Listener`). Für jeden
 * Mitspieler gibt es eine eigene Verbindung; bei einer Handvoll Leuten ist das die einfachste
 * Aufteilung, und der Ton wird ohnehin nur einmal erzeugt.
 */
/**
 * Wohin eingehende Vermittlungsnachrichten gehen.
 *
 * Die Verbindung nimmt sie zentral entgegen; wer sie braucht, hängt sich hier ein — je nach
 * Rolle der Sender oder der Empfänger.
 */
let handler: ((from: string, signal: RtcSignal) => void) | undefined;

/**
 * Was eintrifft, bevor sich jemand eingehängt hat.
 *
 * Der Gastgeber ruft an, sobald sein Song geladen ist — das kann vor dem ersten Zeichnen des
 * Rundenbildschirms beim Gast liegen. Ohne diesen Puffer wäre das Angebot weg, und der Gast
 * bekäme nie Ton.
 */
const pending: { from: string; signal: RtcSignal }[] = [];

export function setSignalHandler(next: typeof handler): void {
  handler = next;
  if (!handler) return;

  for (const item of pending.splice(0)) handler(item.from, item.signal);
}

export function handleSignal(from: string, signal: RtcSignal): void {
  if (handler) handler(from, signal);
  else pending.push({ from, signal });
}

function send(to: string, signal: RtcSignal): void {
  getSocket()?.emit(RTC_EVENTS.signal, { to, signal });
}

/**
 * Was neben dem Ton über dieselbe Leitung geht.
 *
 * Bewusst nicht über den Server: Die Position muss denselben Weg nehmen wie der Ton, sonst
 * kommt sie früher oder später an als das, was man hört — und die Balken laufen gegen die
 * Musik.
 */
export type RoundPacket =
  { kind: "chart"; chart: Chart } | { kind: "position"; positionMs: number };

/**
 * Vorschläge, die vor der Beschreibung der Gegenseite eintreffen, sammeln.
 *
 * `addIceCandidate` scheitert, solange `setRemoteDescription` nicht durch ist — und ein
 * verworfener Vorschlag kann die Verbindung kosten. Deshalb erst sammeln, dann nachreichen.
 */
class Candidates {
  private waiting: RtcCandidate[] = [];

  async add(peer: RTCPeerConnection, candidate: RtcCandidate): Promise<void> {
    if (!peer.remoteDescription) {
      this.waiting.push(candidate);
      return;
    }

    await peer.addIceCandidate(candidate).catch((err: unknown) => console.error("[rtc]", err));
  }

  async flush(peer: RTCPeerConnection): Promise<void> {
    for (const candidate of this.waiting.splice(0)) {
      await peer.addIceCandidate(candidate).catch((err: unknown) => console.error("[rtc]", err));
    }
  }
}

function createPeer(remoteId: string): RTCPeerConnection {
  const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  peer.onicecandidate = ({ candidate }) => {
    if (!candidate) return;

    send(remoteId, {
      kind: "candidate",
      candidate: {
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
      },
    });
  };

  return peer;
}

/** Der Besitzer des Songs: schickt seinen Ton an alle anderen. */
export class Broadcaster {
  private readonly peers = new Map<string, RTCPeerConnection>();
  private readonly channels = new Map<string, RTCDataChannel>();
  private readonly candidates = new Map<string, Candidates>();
  /** Nachrichten nacheinander abarbeiten — sonst überholen sie sich. */
  private queue: Promise<void> = Promise.resolve();
  /** Wird jedem geschickt, der neu dazukommt — auch mitten im Song. */
  private chart?: Chart;

  constructor(private readonly stream: MediaStream) {}

  /** Der Chart des eigenen Songs. Die anderen haben die Datei nicht und können ihn nicht bilden. */
  setChart(chart: Chart): void {
    this.chart = chart;
    this.broadcast({ kind: "chart", chart });
  }

  /** Die Position im Song, mehrmals pro Sekunde. */
  sendPosition(positionMs: number): void {
    this.broadcast({ kind: "position", positionMs });
  }

  private broadcast(packet: RoundPacket): void {
    const data = JSON.stringify(packet);

    for (const channel of this.channels.values()) {
      if (channel.readyState === "open") channel.send(data);
    }
  }

  /**
   * Ruft einen Mitspieler an.
   *
   * Eine bestehende Verbindung bleibt bestehen: Der Gast meldet sich wiederholt, bis er Ton
   * hat — würde jede Meldung neu anrufen, käme seine Antwort immer für ein Angebot, das schon
   * ersetzt ist, und es käme nie zustande. Nur eine gescheiterte Verbindung wird ersetzt.
   */
  async call(remoteId: string): Promise<void> {
    const existing = this.peers.get(remoteId);
    if (
      existing &&
      existing.connectionState !== "failed" &&
      existing.connectionState !== "closed"
    ) {
      return;
    }

    this.hangUp(remoteId);

    const peer = createPeer(remoteId);
    this.peers.set(remoteId, peer);

    // Ungeordnet und ohne erneutes Senden: Eine verlorene Position ist in 100 ms überholt,
    // eine nachgelieferte wäre schlimmer als keine. Der Chart geht deshalb gleich mehrfach raus.
    const channel = peer.createDataChannel("round", { ordered: false, maxRetransmits: 0 });
    this.channels.set(remoteId, channel);

    channel.onopen = () => {
      if (this.chart) channel.send(JSON.stringify({ kind: "chart", chart: this.chart }));
    };

    for (const track of this.stream.getAudioTracks()) peer.addTrack(track, this.stream);

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    if (offer.sdp) send(remoteId, { kind: "offer", sdp: offer.sdp });
  }

  handle(from: string, signal: RtcSignal): Promise<void> {
    this.queue = this.queue.then(async () => {
      // Die Gegenseite ist bereit — jetzt lohnt der Anruf.
      if (signal.kind === "hello") {
        await this.call(from);
        return;
      }

      const peer = this.peers.get(from);
      if (!peer) return;

      const candidates = this.candidates.get(from) ?? new Candidates();
      this.candidates.set(from, candidates);

      if (signal.kind === "answer") {
        // Antworten auf eine bereits ersetzte Verbindung ignorieren.
        if (peer.signalingState !== "have-local-offer") return;

        await peer.setRemoteDescription({ type: "answer", sdp: signal.sdp });
        await candidates.flush(peer);
        return;
      }

      if (signal.kind === "candidate") await candidates.add(peer, signal.candidate);
    });

    return this.queue;
  }

  hangUp(remoteId?: string): void {
    if (remoteId) {
      this.peers.get(remoteId)?.close();
      this.peers.delete(remoteId);
      this.channels.delete(remoteId);
      return;
    }

    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    this.channels.clear();
  }
}

/** Die Mitspieler: nehmen den Ton des Besitzers entgegen. */
export class Listener {
  private peer?: RTCPeerConnection;
  private hostId?: string;
  private candidates = new Candidates();
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly onStream: (stream: MediaStream) => void,
    private readonly onPacket: (packet: RoundPacket) => void,
  ) {}

  handle(from: string, signal: RtcSignal): Promise<void> {
    this.queue = this.queue.then(() => this.process(from, signal));
    return this.queue;
  }

  private async process(from: string, signal: RtcSignal): Promise<void> {
    if (signal.kind === "offer") {
      // Ein neues Angebot ersetzt die alte Verbindung — etwa, wenn der Song neu startet.
      this.close();

      const peer = createPeer(from);
      this.peer = peer;
      this.hostId = from;
      this.candidates = new Candidates();

      peer.ontrack = ({ streams }) => {
        const [stream] = streams;
        if (stream) this.onStream(stream);
      };

      peer.ondatachannel = ({ channel }) => {
        channel.onmessage = ({ data }) => {
          if (typeof data !== "string") return;

          try {
            this.onPacket(JSON.parse(data) as RoundPacket);
          } catch (err) {
            console.error("[rtc]", err);
          }
        };
      };

      await peer.setRemoteDescription({ type: "offer", sdp: signal.sdp });

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      if (answer.sdp) send(from, { kind: "answer", sdp: answer.sdp });
      await this.candidates.flush(peer);
      return;
    }

    if (signal.kind === "candidate" && this.peer) {
      await this.candidates.add(this.peer, signal.candidate);
    }
  }

  /** Dem Besitzer sagen, dass hier jemand zuhört. */
  announce(ownerId: string): void {
    send(ownerId, { kind: "hello" });
  }

  /** Ob schon ein Angebot eingegangen ist — dann muss sich niemand mehr melden. */
  get connecting(): boolean {
    return Boolean(this.peer);
  }

  close(): void {
    this.peer?.close();
    this.peer = undefined;
    this.hostId = undefined;
  }
}
