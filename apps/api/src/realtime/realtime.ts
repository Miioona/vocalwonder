import type { Server as HttpServer } from "node:http";

import { fromNodeHeaders } from "better-auth/node";
import { Server } from "socket.io";
import { REALTIME_EVENTS, userRoom } from "@vocalwonder/core";
import type { ClientEvents, ServerEvents } from "@vocalwonder/core";

import { env } from "../config/env.js";
import { getAuth } from "../modules/auth/auth.js";
import { getFriendIds } from "../modules/friends/friend.service.js";
import { touchLastSeen } from "../modules/profile/profile.service.js";
import {
  refreshLobby,
  registerLobbyHandlers,
  scheduleLobbyCleanup,
  sendCurrentLobby,
} from "./lobby-handlers.js";
import {
  activityOf,
  addConnection,
  onlineAmong,
  removeConnection,
  setReportedActivity,
} from "./presence.js";

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

    // **Vor** allem Warten auf die Datenbank: Der Browser meldet seine Tätigkeit sofort nach
    // dem Verbinden. Wäre die Verbindung dann noch nicht eingetragen, ginge die Meldung
    // verloren — und der Betreffende stünde bei allen als "im Menü" da.
    const isFirst = addConnection(userId);

    void (async () => {
      await socket.join(userRoom(userId));

      const friendIds = await getFriendIds(userId);

      // Erst der eigene Stand, dann die anderen benachrichtigen.
      socket.emit(REALTIME_EVENTS.presenceSnapshot, { online: onlineAmong(friendIds) });
      await sendCurrentLobby(socket, userId);

      if (isFirst) {
        announce(friendIds, { userId, online: true, activity: activityOf(userId) });
        // Wer wiederkommt, soll in der Lobby nicht weiter als "weg" stehen.
        await refreshLobby(io as Server<ClientEvents, ServerEvents>, userId);
      }
    })().catch((err: unknown) => console.error("[realtime] Verbindungsaufbau", err));

    registerLobbyHandlers(io as Server<ClientEvents, ServerEvents>, socket, userId);

    // Was der Browser meldet: "im Menü" oder "singt". Alles Weitere weiß der Server selbst.
    socket.on(REALTIME_EVENTS.activity, (activity) => {
      // Nur weitersagen, wenn sich wirklich etwas ändert — der Browser meldet auch mal
      // dasselbe zweimal, etwa beim Wiederverbinden.
      if (activityOf(userId) === activity) return;

      setReportedActivity(userId, activity);
      void announceActivity(userId);
    });

    socket.on("disconnect", () => {
      void (async () => {
        if (!removeConnection(userId)) return;

        const lastSeenAt = new Date();
        await touchLastSeen(userId);

        const friendIds = await getFriendIds(userId);
        announce(friendIds, { userId, online: false, lastSeenAt: lastSeenAt.toISOString() });

        // Nicht sofort aus der Lobby werfen — ein Neuladen sieht genauso aus wie ein Weggehen.
        // Die Lobby erfährt aber sofort davon, damit dort "Verbindung verloren" steht.
        if (io) {
          await refreshLobby(io, userId);
          scheduleLobbyCleanup(io, userId);
        }
      })().catch((err: unknown) => console.error("[realtime] Verbindungsabbau", err));
    });
  });

  console.log("[realtime] socket.io bereit");
}

/**
 * Die Tätigkeit eines Nutzers an seine Freunde melden.
 *
 * Wird auch aus der Lobby heraus aufgerufen: Wer beitritt oder geht, ändert damit, was seine
 * Freunde über ihn sehen — und ob eine Einladung an ihn gerade sinnvoll wäre.
 */
export async function announceActivity(userId: string): Promise<void> {
  const friendIds = await getFriendIds(userId);
  announce(friendIds, { userId, online: true, activity: activityOf(userId) });
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
