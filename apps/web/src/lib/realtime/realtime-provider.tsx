"use client";

import { useEffect } from "react";

import { REALTIME_EVENTS, type FriendEvent } from "@vocalwonder/core";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";

import { useSession } from "@/lib/auth/auth-client";
import { CONFIG } from "@/lib/config/config";
import { QUERY_KEYS } from "@/lib/query-keys";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useRealtimeStore, type QueuedEvent } from "@/stores/useRealtimeStore";

/**
 * Hält die Verbindung zum Backend, solange jemand angemeldet ist.
 *
 * Eine Verbindung für die ganze App, nicht je Bildschirm: Sie überlebt Seitenwechsel, weil
 * sie hier hängt und nicht in einer Seite. Ohne Konto wird gar nicht erst verbunden — es
 * gäbe nichts zu übertragen.
 */
export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      useRealtimeStore.getState().reset();
      return;
    }

    const store = useRealtimeStore.getState();
    store.setStatus("connecting");

    const socket: Socket = io(CONFIG.API.BASE_URL, {
      // Schickt das Sitzungs-Cookie beim Handschlag mit — dieselbe Anmeldung wie bei REST.
      withCredentials: true,
      // Der Gratisdienst schläft nach 15 Minuten ein; der erste Versuch am Tag darf dauern.
      timeout: 60_000,
    });

    socket.on("connect", () => useRealtimeStore.getState().setStatus("online"));
    socket.on("disconnect", () => useRealtimeStore.getState().setStatus("connecting"));

    socket.on("connect_error", (error) => {
      // Zwei Fälle: schlafender Server (versucht es weiter) oder abgelaufene Sitzung.
      console.error("[realtime]", error.message);
      useRealtimeStore.getState().setStatus("connecting");
    });

    socket.on(REALTIME_EVENTS.presenceSnapshot, ({ online }) => {
      useRealtimeStore.getState().setOnline(online);
    });

    socket.on(REALTIME_EVENTS.presenceChanged, ({ userId: friendId, online }) => {
      useRealtimeStore.getState().setPresence(friendId, online);
    });

    const onFriendEvent = (kind: QueuedEvent["kind"]) => (event: FriendEvent) => {
      // Die Liste hat sich geändert, egal ob gerade jemand hinsieht.
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FRIENDS] });

      // Während des Singens nichts einblenden — das kommt danach.
      if (usePlayerStore.getState().mode === "play") {
        useRealtimeStore.getState().queue({ kind, event });
        return;
      }

      showEvent({ kind, event });
    };

    socket.on(REALTIME_EVENTS.friendRequest, onFriendEvent("request"));
    socket.on(REALTIME_EVENTS.friendAccepted, onFriendEvent("accepted"));

    return () => {
      socket.close();
      useRealtimeStore.getState().reset();
    };
  }, [userId, queryClient]);

  // Nach dem Singen nachholen, was liegen geblieben ist.
  useEffect(
    () =>
      usePlayerStore.subscribe((state, previous) => {
        if (previous.mode !== "play" || state.mode === "play") return;
        for (const item of useRealtimeStore.getState().drain()) showEvent(item);
      }),
    [],
  );

  return <>{children}</>;
};

function showEvent({ kind, event }: QueuedEvent) {
  const name = event.player.playerName;

  if (kind === "request") toast(`${name} möchte dich hinzufügen`);
  else toast(`${name} ist jetzt dein Freund`);
}
