import type { Server as HttpServer } from "node:http";

import { fromNodeHeaders } from "better-auth/node";
import { Server } from "socket.io";
import { REALTIME_EVENTS, userRoom } from "@vocalwonder/core";
import type { ClientEvents, ServerEvents } from "@vocalwonder/core";

import { env } from "../config/env.js";
import { getAuth } from "../modules/auth/auth.js";
import { getFriendIds } from "../modules/friends/friend.service.js";
import { touchLastSeen } from "../modules/profile/profile.service.js";
import { addConnection, onlineAmong, removeConnection } from "./presence.js";

/**
 * Die offene Verbindung zum Browser.
 *
 * Zweck heute: Anwesenheit. Wer verbunden ist, ist online — kein Nachfragen im Takt, kein
 * Verzug, und ein Verbindungsabbruch ist sofort sichtbar. Später laufen hier die Duelle
 * darüber, und dafür braucht es ohnehin eine Leitung, die von sich aus etwas schickt.
 *
 * Angemeldet wird über dasselbe Sitzungs-Cookie wie bei den REST-Aufrufen; ohne gültige
 * Sitzung kommt die Verbindung gar nicht erst zustande.
 */
let io: Server<ClientEvents, ServerEvents> | undefined;

export function attachRealtime(server: HttpServer): void {
  io = new Server<ClientEvents, ServerEvents>(server, {
    // Dieselbe Herkunft wie bei den REST-Aufrufen — der Handschlag schickt das Cookie mit.
    cors: { origin: [env.WEB_ORIGIN.replace(/\/+$/, "")], credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const session = await getAuth().api.getSession({
        headers: fromNodeHeaders(socket.request.headers),
      });

      if (!session) {
        next(new Error("Nicht angemeldet"));
        return;
      }

      socket.data.userId = session.user.id;
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error("Anmeldung fehlgeschlagen"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    void (async () => {
      await socket.join(userRoom(userId));

      const friendIds = await getFriendIds(userId);

      // Erst der eigene Stand, dann die anderen benachrichtigen.
      socket.emit(REALTIME_EVENTS.presenceSnapshot, { online: onlineAmong(friendIds) });

      if (addConnection(userId)) {
        announce(friendIds, { userId, online: true });
      }
    })().catch((err: unknown) => console.error("[realtime] Verbindungsaufbau", err));

    socket.on("disconnect", () => {
      void (async () => {
        if (!removeConnection(userId)) return;

        const lastSeenAt = new Date();
        await touchLastSeen(userId);

        const friendIds = await getFriendIds(userId);
        announce(friendIds, { userId, online: false, lastSeenAt: lastSeenAt.toISOString() });
      })().catch((err: unknown) => console.error("[realtime] Verbindungsabbau", err));
    });
  });

  console.log("[realtime] socket.io bereit");
}

/** Anwesenheit an alle Freunde melden — jeder in seinem eigenen Raum. */
function announce(friendIds: string[], payload: Parameters<ServerEvents["presence:changed"]>[0]) {
  if (!io) return;
  for (const friendId of friendIds) {
    io.to(userRoom(friendId)).emit(REALTIME_EVENTS.presenceChanged, payload);
  }
}

/**
 * Ein Ereignis an einen Nutzer schicken — aus einer gewöhnlichen Route heraus.
 *
 * Tut nichts, wenn der Empfänger gerade nicht verbunden ist. Das ist Absicht: Was er verpasst
 * hat, steht beim nächsten Laden ohnehin in seiner Freundesliste.
 */
export function emitToUser<E extends keyof ServerEvents>(
  userId: string,
  event: E,
  ...payload: Parameters<ServerEvents[E]>
): void {
  io?.to(userRoom(userId)).emit(event, ...payload);
}
