import { randomUUID } from "node:crypto";

import type {
  LobbyMessage,
  LobbyScore,
  LobbyState,
  QueuedSongInput,
  RoundResult,
} from "@vocalwonder/core";
import { LOBBY_HISTORY, LOBBY_MESSAGE_MAX } from "@vocalwonder/core";

import { isOnline } from "../../realtime/presence.js";
import { getFriendIds } from "../friends/friend.service.js";
import { getPublicPlayers } from "../profile/profile.service.js";
import {
  assignColor,
  createLobby,
  deleteLobby,
  forgetMember,
  getLobby,
  getLobbyOfUser,
  saveLobby,
  type Lobby,
} from "./lobby.store.js";

/** Absage mit Grund — die Oberfläche zeigt ihn, statt still nichts zu tun. */
export class LobbyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LobbyError";
  }
}

/** Der Stand, wie ihn die Teilnehmer sehen: mit Namen und Bildern statt bloßer IDs. */
export async function toLobbyState(lobby: Lobby): Promise<LobbyState> {
  const players = await getPublicPlayers([...lobby.memberIds, ...lobby.invitedIds]);

  return {
    code: lobby.code,
    hostId: lobby.hostId,
    players: lobby.memberIds.flatMap((id) => {
      const player = players.get(id);
      return player ? [{ ...player, connected: isOnline(id), color: assignColor(lobby, id) }] : [];
    }),
    invited: lobby.invitedIds.flatMap((id) => players.get(id) ?? []),
    queue: lobby.queue,
    ready: lobby.ready,
    locked: lobby.locked,
  };
}

/**
 * Einen Song einstellen.
 *
 * Ob er analysiert ist, meldet der Browser des Besitzers — prüfen kann der Server das nicht,
 * die Datei liegt ja nicht hier. Ohne Chart darf trotzdem gestartet werden; dann gibt es für
 * diesen Song eben keine Punkte.
 */
export function addSong(userId: string, input: QueuedSongInput): Lobby {
  const lobby = requireLobby(userId);
  if (lobby.locked) throw new LobbyError("Die Liste steht schon fest.");

  lobby.queue = [...lobby.queue, { ...input, id: randomUUID(), addedBy: userId }];

  // Wer schon bereit war, hat diesen Song nicht mitentschieden — also noch einmal alle fragen.
  lobby.ready = [];
  saveLobby(lobby);

  return lobby;
}

/**
 * Bereit oder doch nicht.
 *
 * Losgehen kann es, wenn **alle Anwesenden** bereit sind und mindestens ein Song in der Liste
 * steht. Wer keine Verbindung hat, blockiert nicht — sonst hinge die Runde bis zum Ablauf
 * seiner Schonfrist.
 */
export function setReady(userId: string, ready: boolean): { lobby: Lobby; start: boolean } {
  const lobby = requireLobby(userId);

  lobby.ready = ready
    ? [...new Set([...lobby.ready, userId])]
    : lobby.ready.filter((id) => id !== userId);

  const waitingFor = lobby.memberIds.filter((id) => isOnline(id) && !lobby.ready.includes(id));
  const start = waitingFor.length === 0 && lobby.queue.length > 0;

  if (start) {
    // Ab jetzt steht die Liste. Und für die nächste Runde fängt die Bereitschaft von vorn an.
    lobby.locked = true;
    lobby.ready = [];
    lobby.scores = {};
    lobby.roundId = randomUUID();
  }

  saveLobby(lobby);
  return { lobby, start };
}

/**
 * Der Punktestand eines Spielers im laufenden Song.
 *
 * Gerechnet wird bei jedem selbst — der Server sammelt nur ein und verteilt weiter, damit
 * alle dieselbe Rangfolge sehen.
 */
export function setScore(userId: string, points: number, ratio: number): Lobby | undefined {
  const lobby = getLobbyOfUser(userId);
  if (!lobby) return undefined;

  lobby.scores[userId] = { userId, points, ratio };
  saveLobby(lobby);

  return lobby;
}

/**
 * Der Song ist durch.
 *
 * Melden darf das nur, wem er gehört: Bei ihm läuft die Datei, er merkt das Ende zuerst — und
 * ein Mitspieler mit hakeliger Verbindung soll die Runde nicht für alle beenden.
 *
 * Der gesungene Song fliegt aus der Liste, die Punkte wandern in die Gesamtwertung, und die
 * Bereitschaft fängt für den nächsten von vorn an.
 */
export function finishRound(userId: string): RoundResult | undefined {
  const lobby = getLobbyOfUser(userId);
  const song = lobby?.queue[0];
  if (!lobby || !song || song.addedBy !== userId) return undefined;

  const scores = byPoints(Object.values(lobby.scores));

  for (const score of scores) {
    lobby.totals[score.userId] = (lobby.totals[score.userId] ?? 0) + score.points;
  }

  const result: RoundResult = {
    song,
    roundId: lobby.roundId ?? "",
    scores,
    totals: byPoints(
      Object.entries(lobby.totals).map(([id, points]) => ({ userId: id, points, ratio: 0 })),
    ),
    next: lobby.queue[1] ?? null,
  };

  lobby.queue = lobby.queue.slice(1);
  lobby.scores = {};
  lobby.ready = [];
  lobby.roundId = undefined;

  // Ist alles gesungen, fängt eine neue Sitzung an — sonst säßen alle in einer Lobby, in der
  // sich nichts mehr einstellen lässt.
  if (lobby.queue.length === 0) lobby.locked = false;

  saveLobby(lobby);

  return result;
}

function byPoints(scores: LobbyScore[]): LobbyScore[] {
  return [...scores].sort((a, b) => b.points - a.points);
}

/** Rauswerfen darf, wer ihn eingestellt hat — und der Gastgeber. */
export function removeSong(userId: string, songId: string): Lobby {
  const lobby = requireLobby(userId);
  if (lobby.locked) throw new LobbyError("Die Liste steht schon fest.");

  const song = lobby.queue.find((entry) => entry.id === songId);
  if (!song) throw new LobbyError("Den Song gibt es nicht mehr.");
  if (song.addedBy !== userId && lobby.hostId !== userId) {
    throw new LobbyError("Das ist nicht dein Song.");
  }

  lobby.queue = lobby.queue.filter((entry) => entry.id !== songId);
  saveLobby(lobby);

  return lobby;
}

/** Die Reihenfolge bestimmt allein der Gastgeber — sonst zieht jeder seinen Song nach vorn. */
export function moveSong(userId: string, songId: string, toIndex: number): Lobby {
  const lobby = requireLobby(userId);
  if (lobby.locked) throw new LobbyError("Die Liste steht schon fest.");
  if (lobby.hostId !== userId) throw new LobbyError("Das darf nur der Gastgeber.");

  const from = lobby.queue.findIndex((entry) => entry.id === songId);
  if (from < 0) throw new LobbyError("Den Song gibt es nicht mehr.");

  const target = Math.min(Math.max(toIndex, 0), lobby.queue.length - 1);
  const queue = [...lobby.queue];
  const [song] = queue.splice(from, 1);
  if (song) queue.splice(target, 0, song);

  lobby.queue = queue;
  saveLobby(lobby);

  return lobby;
}

/**
 * Jemanden entfernen.
 *
 * Anwesende darf nur der Gastgeber. Wer selbst nicht verbunden ist, kann von jedem entfernt
 * werden — er ist ohnehin nicht da, und sonst blockiert ein abgestürzter Gastgeber die ganze
 * Runde, bis seine Schonfrist abgelaufen ist.
 */
export function kickMember(actorId: string, targetId: string): { lobby: Lobby; closed: boolean } {
  const lobby = requireLobby(actorId);
  if (!lobby.memberIds.includes(targetId)) throw new LobbyError("Der ist gar nicht hier.");
  if (actorId === targetId) throw new LobbyError("Zum Gehen gibt es den Verlassen-Knopf.");

  if (lobby.hostId !== actorId && isOnline(targetId)) {
    throw new LobbyError("Das darf nur der Gastgeber.");
  }

  return removeMember(lobby, targetId);
}

function requireLobby(userId: string): Lobby {
  const lobby = getLobbyOfUser(userId);
  if (!lobby) throw new LobbyError("Du bist in keiner Lobby.");
  return lobby;
}

/**
 * Jemanden einladen. Die Lobby entsteht dabei, falls es noch keine gibt.
 *
 * Nur Freunde, und nur solche, die gerade verbunden sind — wer weg ist, kann nicht antworten,
 * und eine Einladung, die niemand sieht, blockiert nur den Einladenden.
 */
export async function invitePlayer(
  hostId: string,
  targetId: string,
): Promise<{ lobby: Lobby; targetWasInvited: boolean }> {
  if (hostId === targetId) throw new LobbyError("Dich selbst brauchst du nicht einzuladen.");

  const friendIds = await getFriendIds(hostId);
  if (!friendIds.includes(targetId)) throw new LobbyError("Das ist keiner deiner Freunde.");

  if (!isOnline(targetId)) throw new LobbyError("Gerade nicht da.");
  if (getLobbyOfUser(targetId)) throw new LobbyError("Sitzt schon in einer Lobby.");

  const lobby = getLobbyOfUser(hostId) ?? createLobby(hostId);

  if (lobby.hostId !== hostId) throw new LobbyError("Nur der Gastgeber lädt ein.");
  if (lobby.invitedIds.includes(targetId)) {
    return { lobby, targetWasInvited: false };
  }

  lobby.invitedIds.push(targetId);
  saveLobby(lobby);

  return { lobby, targetWasInvited: true };
}

export async function acceptInvite(userId: string, code: string): Promise<Lobby> {
  const lobby = getLobby(code);
  if (!lobby) throw new LobbyError("Diese Lobby gibt es nicht mehr.");
  if (!lobby.invitedIds.includes(userId)) throw new LobbyError("Keine offene Einladung.");
  if (getLobbyOfUser(userId)) throw new LobbyError("Du sitzt schon in einer Lobby.");

  lobby.invitedIds = lobby.invitedIds.filter((id) => id !== userId);
  lobby.memberIds.push(userId);
  saveLobby(lobby);

  return lobby;
}

export function declineInvite(userId: string, code: string): { lobby: Lobby; closed: boolean } {
  const lobby = getLobby(code);
  if (!lobby) throw new LobbyError("Diese Lobby gibt es nicht mehr.");

  lobby.invitedIds = lobby.invitedIds.filter((id) => id !== userId);
  saveLobby(lobby);

  // Bleibt der Gastgeber allein und ohne offene Einladung zurück, ist die Lobby sinnlos.
  const closed = lobby.memberIds.length <= 1 && lobby.invitedIds.length === 0;
  if (closed) deleteLobby(lobby);

  return { lobby, closed };
}

/**
 * Eine Nachricht in die Lobby.
 *
 * Der Server hängt Absender und Zeit an — beides vom Browser zu übernehmen hieße, sich auf
 * Angaben zu verlassen, die jeder verändern kann.
 */
export async function postMessage(userId: string, text: string): Promise<LobbyMessage> {
  const lobby = getLobbyOfUser(userId);
  if (!lobby) throw new LobbyError("Du bist in keiner Lobby.");

  const trimmed = text.trim().slice(0, LOBBY_MESSAGE_MAX);
  if (!trimmed) throw new LobbyError("Nichts zu senden.");

  const player = (await getPublicPlayers([userId])).get(userId);
  if (!player) throw new LobbyError("Setz zuerst einen Spielernamen.");

  const message: LobbyMessage = {
    id: randomUUID(),
    kind: "chat",
    player,
    text: trimmed,
    at: new Date().toISOString(),
  };

  return remember(lobby, message);
}

/** Kommen, Gehen, später der Songwechsel — was die Lobby selbst zu sagen hat. */
export function systemMessage(lobby: Lobby, text: string): LobbyMessage {
  return remember(lobby, {
    id: randomUUID(),
    kind: "system",
    text,
    at: new Date().toISOString(),
  });
}

function remember(lobby: Lobby, message: LobbyMessage): LobbyMessage {
  lobby.messages = [...lobby.messages, message].slice(-LOBBY_HISTORY);
  saveLobby(lobby);
  return message;
}

/**
 * Verlassen — freiwillig oder weil die Verbindung weg ist.
 *
 * Geht der Gastgeber, rückt der Nächste nach, statt die Runde aufzulösen. Nur wenn niemand
 * mehr da ist, verschwindet sie.
 */
export function leaveLobby(userId: string): { lobby: Lobby; closed: boolean } | undefined {
  const lobby = getLobbyOfUser(userId);
  if (!lobby) return undefined;

  return removeMember(lobby, userId);
}

/**
 * Jemanden aus der Lobby nehmen — gleich, ob freiwillig oder entfernt.
 *
 * **Seine Songs gehen mit.** Er ist der Einzige, der sie abspielen könnte; ohne ihn wäre der
 * Eintrag eine Sackgasse. Das ist auch der einzige Fall, in dem sich eine festgezurrte Liste
 * noch ändert.
 */
function removeMember(lobby: Lobby, userId: string): { lobby: Lobby; closed: boolean } {
  lobby.memberIds = lobby.memberIds.filter((id) => id !== userId);
  lobby.queue = lobby.queue.filter((song) => song.addedBy !== userId);
  forgetMember(userId);

  if (lobby.memberIds.length === 0) {
    deleteLobby(lobby);
    return { lobby, closed: true };
  }

  // Der Nächste rückt nach. Die Liste ist hier nachweislich nicht leer, der Typ weiß es nicht.
  if (lobby.hostId === userId) lobby.hostId = lobby.memberIds[0] ?? lobby.hostId;
  saveLobby(lobby);

  return { lobby, closed: false };
}

export { getLobbyOfUser };
