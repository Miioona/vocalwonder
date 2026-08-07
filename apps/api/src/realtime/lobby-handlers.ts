import { LOBBY_EVENTS, RTC_EVENTS, userRoom } from "@vocalwonder/core";
import type { ClientEvents, LobbyAck, LobbyMessage, ServerEvents } from "@vocalwonder/core";
import type { Server, Socket } from "socket.io";

import {
  LobbyError,
  acceptInvite,
  addSong,
  kickMember,
  moveSong,
  removeSong,
  declineInvite,
  finishRound,
  getLobbyOfUser,
  invitePlayer,
  leaveLobby,
  postMessage,
  setReady,
  setScore,
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

  socket.on(LOBBY_EVENTS.addSong, (song, ack) => {
    void run(ack, async () => {
      const lobby = addSong(userId, song);
      await broadcast(io, lobby);

      const player = await getPublicPlayer(userId);
      announceMessage(
        io,
        lobby,
        systemMessage(lobby, `${player?.playerName ?? "Jemand"} hat „${song.title}" eingestellt`),
      );
    });
  });

  socket.on(LOBBY_EVENTS.removeSong, (songId, ack) => {
    void run(ack, async () => {
      await broadcast(io, removeSong(userId, songId));
    });
  });

  socket.on(LOBBY_EVENTS.moveSong, (songId, toIndex, ack) => {
    void run(ack, async () => {
      await broadcast(io, moveSong(userId, songId, toIndex));
    });
  });

  socket.on(LOBBY_EVENTS.kick, (targetId, ack) => {
    void run(ack, async () => {
      const target = await getPublicPlayer(targetId);
      const { lobby, closed } = kickMember(userId, targetId);

      // Der Entfernte sitzt in keiner Lobby mehr — das muss er auch erfahren.
      io.to(userRoom(targetId)).emit(LOBBY_EVENTS.state, null);

      if (closed) {
        close(io, lobby);
        return;
      }

      await broadcast(io, lobby);
      announceMessage(
        io,
        lobby,
        systemMessage(lobby, `${target?.playerName ?? "Jemand"} wurde entfernt`),
      );
      await announceActivity(targetId);
    });
  });

  /**
   * Vermittlung durchreichen.
   *
   * Der Server liest den Inhalt nicht — er prüft nur, dass beide in derselben Lobby sitzen.
   * Ohne diese Prüfung könnte jeder jedem Verbindungsanfragen schicken.
   */
  socket.on(RTC_EVENTS.signal, ({ to, signal }) => {
    const lobby = getLobbyOfUser(userId);
    if (!lobby?.memberIds.includes(to)) return;

    io.to(userRoom(to)).emit(RTC_EVENTS.signal, { from: userId, signal });
  });

  socket.on(LOBBY_EVENTS.ready, (ready, ack) => {
    void run(ack, async () => {
      const { lobby, start } = setReady(userId, ready);
      await broadcast(io, lobby);

      if (!start) return;

      const song = lobby.queue[0];
      if (!song) return;

      announceMessage(io, lobby, systemMessage(lobby, `Los geht's: „${song.title}"`));
      for (const memberId of lobby.memberIds) {
        io.to(userRoom(memberId)).emit(LOBBY_EVENTS.start, { song });
      }
    });
  });

  /** Kein Rückkanal nötig: Der nächste Stand kommt in einer Sekunde ohnehin. */
  socket.on(LOBBY_EVENTS.score, ({ points, ratio }) => {
    const lobby = setScore(userId, points, ratio);
    if (!lobby) return;

    const scores = Object.values(lobby.scores);
    for (const memberId of lobby.memberIds) {
      io.to(userRoom(memberId)).emit(LOBBY_EVENTS.scores, scores);
    }
  });

  socket.on(LOBBY_EVENTS.finished, () => {
    const result = finishRound(userId);
    const lobby = getLobbyOfUser(userId);
    if (!result || !lobby) return;

    for (const memberId of lobby.memberIds) {
      io.to(userRoom(memberId)).emit(LOBBY_EVENTS.results, result);
    }

    void broadcast(io, lobby).catch((err: unknown) => console.error("[lobby]", err));
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
 * selbst das Spielen. Fünf Minuten decken einen Router-Neustart oder einen Netzwechsel am
 * Telefon ab; wer nicht so lange warten will, kann den Betreffenden vorher entfernen —
 * jemanden ohne Verbindung darf jeder aus der Lobby nehmen.
 */
const GRACE_MS = 5 * 60_000;

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

/** Den Stand neu verteilen, wenn sich außerhalb der Befehle etwas geändert hat — etwa die Verbindung. */
export async function refreshLobby(io: LobbyServer, userId: string): Promise<void> {
  const lobby = getLobbyOfUser(userId);
  if (lobby) await broadcast(io, lobby);
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
