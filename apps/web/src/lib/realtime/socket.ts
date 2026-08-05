"use client";

import { LOBBY_EVENTS } from "@vocalwonder/core";
import type { ClientEvents, ServerEvents } from "@vocalwonder/core";
import type { Socket } from "socket.io-client";

export type AppSocket = Socket<ServerEvents, ClientEvents>;

/**
 * Die eine offene Verbindung, erreichbar auch außerhalb von React.
 *
 * Aufgebaut wird sie im Provider; Knöpfe irgendwo in der App brauchen sie aber ebenfalls,
 * ohne sie durch den halben Baum durchzureichen.
 */
let socket: AppSocket | undefined;

export function setSocket(next: AppSocket | undefined): void {
  socket = next;
}

/**
 * Einen Befehl schicken und auf die Antwort warten.
 *
 * Ohne Verbindung gibt es eine Absage statt eines stillen Nichts — sonst klickt jemand und
 * nichts passiert, ohne dass er erfährt, warum.
 */
function command<E extends keyof ClientEvents>(
  event: E,
  ...args: Parameters<ClientEvents[E]> extends [...infer Rest, unknown] ? Rest : never[]
): Promise<{ ok: boolean; message?: string }> {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ ok: false, message: "Keine Verbindung." });
      return;
    }

    // socket.io reicht das letzte Argument als Rückruf durch.
    (socket.emit as (name: string, ...rest: unknown[]) => void)(event, ...args, resolve);
  });
}

export const lobbyCommands = {
  invite: (userId: string) => command(LOBBY_EVENTS.invitePlayer, userId),
  accept: (code: string) => command(LOBBY_EVENTS.accept, code),
  decline: (code: string) => command(LOBBY_EVENTS.decline, code),
  leave: () => command(LOBBY_EVENTS.leave),
  send: (text: string) => command(LOBBY_EVENTS.send, text),
};
