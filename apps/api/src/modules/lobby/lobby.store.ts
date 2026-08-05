import { LOBBY_CODE_ALPHABET, LOBBY_CODE_LENGTH } from "@vocalwonder/core";
import type { LobbyMessage } from "@vocalwonder/core";

/** Wie eine Lobby auf dem Server aussieht — ohne Namen und Bilder, die kommen aus den Profilen. */
export interface Lobby {
  code: string;
  hostId: string;
  /** Wer drin sitzt, Gastgeber zuerst. */
  memberIds: string[];
  /** Wer eingeladen ist und noch nicht geantwortet hat. */
  invitedIds: string[];
  /** Die letzten Nachrichten — wer dazukommt, soll den Faden nicht verlieren. */
  messages: LobbyMessage[];
  createdAt: Date;
}

/**
 * Der Lobby-Zustand — im Arbeitsspeicher, absichtlich.
 *
 * Lobbys sind kurzlebig, und wenn der Serverprozess neu startet, sind ohnehin alle
 * Verbindungen weg; eine Lobby ohne Teilnehmer nützt niemandem. Eine Datenbank bräuchte
 * dafür ein Verfallsdatum und Aufräumarbeiten, ohne dass jemand etwas davon hätte.
 *
 * **Alles läuft über dieses Modul.** Steht später ein zweiter Serverprozess da, wandert der
 * Inhalt nach Redis — und zwar nur hier, nicht verstreut über die Anwendung.
 */
const lobbies = new Map<string, Lobby>();

/** Wer in welcher Lobby sitzt oder eingeladen ist — damit die Suche nicht über alle läuft. */
const lobbyOfUser = new Map<string, string>();

function randomCode(): string {
  let code = "";
  for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
    code += LOBBY_CODE_ALPHABET[Math.floor(Math.random() * LOBBY_CODE_ALPHABET.length)];
  }
  return code;
}

export function createLobby(hostId: string): Lobby {
  let code = randomCode();
  while (lobbies.has(code)) code = randomCode();

  const lobby: Lobby = {
    code,
    hostId,
    memberIds: [hostId],
    invitedIds: [],
    messages: [],
    createdAt: new Date(),
  };

  lobbies.set(code, lobby);
  lobbyOfUser.set(hostId, code);
  return lobby;
}

export function getLobby(code: string): Lobby | undefined {
  return lobbies.get(code);
}

/** Die Lobby, in der jemand sitzt — Eingeladene zählen nicht dazu, die haben ja noch nicht zugesagt. */
export function getLobbyOfUser(userId: string): Lobby | undefined {
  const code = lobbyOfUser.get(userId);
  return code ? lobbies.get(code) : undefined;
}

export function saveLobby(lobby: Lobby): void {
  lobbies.set(lobby.code, lobby);
  for (const memberId of lobby.memberIds) lobbyOfUser.set(memberId, lobby.code);
}

/** Räumt Mitglieder und Zuordnung mit weg. */
export function deleteLobby(lobby: Lobby): void {
  for (const memberId of lobby.memberIds) {
    if (lobbyOfUser.get(memberId) === lobby.code) lobbyOfUser.delete(memberId);
  }
  lobbies.delete(lobby.code);
}

export function forgetMember(userId: string): void {
  lobbyOfUser.delete(userId);
}
