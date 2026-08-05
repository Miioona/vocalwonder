import { randomUUID } from "node:crypto";

import type { LobbyMessage, LobbyState } from "@vocalwonder/core";
import { LOBBY_HISTORY, LOBBY_MESSAGE_MAX } from "@vocalwonder/core";

import { isOnline } from "../../realtime/presence.js";
import { getFriendIds } from "../friends/friend.service.js";
import { getPublicPlayers } from "../profile/profile.service.js";
import {
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
    players: lobby.memberIds.flatMap((id) => players.get(id) ?? []),
    invited: lobby.invitedIds.flatMap((id) => players.get(id) ?? []),
  };
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

  lobby.memberIds = lobby.memberIds.filter((id) => id !== userId);
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
