import { LOBBY_EVENTS, userRoom } from "@vocalwonder/core";
import type { ClientEvents, LobbyAck, LobbyMessage, ServerEvents } from "@vocalwonder/core";
import type { Server, Socket } from "socket.io";

import {
  LobbyError,
  acceptInvite,
  declineInvite,
  getLobbyOfUser,
  invitePlayer,
  leaveLobby,
  postMessage,
  systemMessage,
  toLobbyState,
} from "../modules/lobby/lobby.service.js";
import { getPublicPlayer } from "../modules/profile/profile.service.js";
import type { Lobby } from "../modules/lobby/lobby.store.js";
import { isOnline } from "./presence.js";
import { announceActivity } from "./realtime.js";

type LobbyServer = Server<ClientEvents, ServerEvents>;
type LobbySocket = Socket<ClientEvents, ServerEvents>;

/**
 * Die Befehle rund um die Lobby.
 *
 * Jeder Befehl antwortet — bei einer Absage mit dem Grund im Klartext. Ereignisse gehen an
 * die Räume der Beteiligten, nicht an einzelne Verbindungen: Wer zwei Tabs offen hat, soll in
 * beiden denselben Stand sehen.
 */
export function registerLobbyHandlers(io: LobbyServer, socket: LobbySocket, userId: string): void {
  socket.on(LOBBY_EVENTS.invitePlayer, (targetId, ack) => {
    void run(ack, async () => {
      const { lobby, targetWasInvited } = await invitePlayer(userId, targetId);
      await broadcast(io, lobby);

      if (targetWasInvited) {
        const from = await getPublicPlayer(userId);
        if (from) {
          io.to(userRoom(targetId)).emit(LOBBY_EVENTS.invite, { code: lobby.code, from });
        }
      }
    });
  });

  socket.on(LOBBY_EVENTS.accept, (code, ack) => {
    void run(ack, async () => {
      const lobby = await acceptInvite(userId, code);
      await broadcast(io, lobby);

      // Wer dazukommt, soll den bisherigen Faden sehen und nicht mitten hineinstolpern.
      socket.emit(LOBBY_EVENTS.messages, lobby.messages);

      const player = await getPublicPlayer(userId);
      announceMessage(
        io,
        lobby,
        systemMessage(lobby, `${player?.playerName ?? "Jemand"} ist dabei`),
      );

      // Für die Freunde ändert sich damit, was er gerade tut.
      await announceActivity(userId);
    });
  });

  socket.on(LOBBY_EVENTS.decline, (code, ack) => {
    void run(ack, async () => {
      const { lobby, closed } = declineInvite(userId, code);

      // Wurde die Lobby dabei aufgelöst, ist ihr Zustand nichts mehr wert — dann muss "keine
      // Lobby" raus, sonst hält der Gastgeber weiter einen Raum für offen, den es nicht gibt.
      if (closed) close(io, lobby);
      else await broadcast(io, lobby);

      // Der Gastgeber soll erfahren, warum die Lobby wieder leer ist.
      const player = await getPublicPlayer(userId);
      if (player) io.to(userRoom(lobby.hostId)).emit(LOBBY_EVENTS.declined, { player });
    });
  });

  socket.on(LOBBY_EVENTS.send, (text, ack) => {
    void run(ack, async () => {
      const message = await postMessage(userId, text);
      const lobby = getLobbyOfUser(userId);
      if (lobby) announceMessage(io, lobby, message);
    });
  });

  socket.on(LOBBY_EVENTS.leave, (ack) => {
    void run(ack, async () => {
      const player = await getPublicPlayer(userId);
      const result = leaveLobby(userId);

      if (result?.closed) {
        close(io, result.lobby);
      } else if (result) {
        await broadcast(io, result.lobby);
        announceMessage(
          io,
          result.lobby,
          systemMessage(result.lobby, `${player?.playerName ?? "Jemand"} ist gegangen`),
        );
      }

      io.to(userRoom(userId)).emit(LOBBY_EVENTS.state, null);
      await announceActivity(userId);
    });
  });
}

/**
 * Nach dem Verbindungsabbruch: Schonfrist, dann aus der Lobby.
 *
 * Sofort hinauszuwerfen wäre falsch — ein Neuladen der Seite trennt die Verbindung genauso
 * wie das Schließen des Fensters, und wer neu lädt, soll wieder in seiner Lobby landen.
 * Nie hinauszuwerfen wäre auch falsch, dann sitzen Geister in der Runde und blockieren sich
 * selbst das Spielen. Also eine Minute warten und schauen, ob er wiederkommt.
 */
const GRACE_MS = 60_000;

export function scheduleLobbyCleanup(io: LobbyServer, userId: string): void {
  setTimeout(() => {
    if (isOnline(userId)) return;

    void (async () => {
      const result = leaveLobby(userId);
      if (result?.closed) close(io, result.lobby);
      else if (result) await broadcast(io, result.lobby);
    })().catch((err: unknown) => console.error("[lobby] Aufräumen", err));
  }, GRACE_MS);
}

/** Beim Verbinden: Wer schon in einer Lobby sitzt, bekommt sie sofort — für den Wiedereinstieg. */
export async function sendCurrentLobby(socket: LobbySocket, userId: string): Promise<void> {
  const lobby = getLobbyOfUser(userId);
  socket.emit(LOBBY_EVENTS.state, lobby ? await toLobbyState(lobby) : null);
  if (lobby) socket.emit(LOBBY_EVENTS.messages, lobby.messages);
}

/** Eine Nachricht an alle in der Lobby. */
function announceMessage(io: LobbyServer, lobby: Lobby, message: LobbyMessage): void {
  for (const memberId of lobby.memberIds) {
    io.to(userRoom(memberId)).emit(LOBBY_EVENTS.message, message);
  }
}

/** Die Lobby ist aufgelöst — allen Beteiligten sagen, dass sie in keiner mehr sind. */
function close(io: LobbyServer, lobby: Lobby): void {
  for (const memberId of [...lobby.memberIds, ...lobby.invitedIds]) {
    io.to(userRoom(memberId)).emit(LOBBY_EVENTS.state, null);
  }
}

/** Den neuen Stand an alle Beteiligten — Mitglieder und Eingeladene. */
async function broadcast(io: LobbyServer, lobby: Lobby): Promise<void> {
  const state = await toLobbyState(lobby);

  for (const memberId of [...lobby.memberIds, ...lobby.invitedIds]) {
    io.to(userRoom(memberId)).emit(LOBBY_EVENTS.state, state);
  }
}

/**
 * Führt einen Befehl aus und beantwortet ihn.
 *
 * Eine `LobbyError` ist eine Absage mit Grund und gehört zur Oberfläche; alles andere ist
 * eine Panne und gehört ins Log, nicht in die Antwort.
 */
async function run(ack: LobbyAck, action: () => Promise<void>): Promise<void> {
  try {
    await action();
    ack({ ok: true });
  } catch (err) {
    if (err instanceof LobbyError) {
      ack({ ok: false, message: err.message });
      return;
    }

    console.error("[lobby]", err);
    ack({ ok: false, message: "Das hat gerade nicht geklappt." });
  }
}
