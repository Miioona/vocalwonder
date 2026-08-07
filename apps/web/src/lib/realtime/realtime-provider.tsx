"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  LOBBY_EVENTS,
  REALTIME_EVENTS,
  RTC_EVENTS,
  type Activity,
  type FriendEvent,
} from "@vocalwonder/core";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { toast } from "sonner";

import { useSession } from "@/lib/auth/auth-client";
import { CONFIG } from "@/lib/config/config";
import { QUERY_KEYS } from "@/lib/query-keys";
import { setSocket, type AppSocket } from "@/lib/realtime/socket";
import { handleSignal } from "@/lib/rtc/broadcast";
import { useLobbyStore } from "@/stores/useLobbyStore";
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
  const pathname = usePathname();
  const reportRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      useRealtimeStore.getState().reset();
      return;
    }

    const store = useRealtimeStore.getState();
    store.setStatus("connecting");

    const socket: AppSocket = io(CONFIG.API.BASE_URL, {
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

    socket.on(REALTIME_EVENTS.presenceChanged, ({ userId: friendId, online, activity }) => {
      useRealtimeStore.getState().setPresence(friendId, online, activity);
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

    // Der Server ist die einzige Wahrheit über die Lobby — hier wird nur übernommen.
    socket.on(LOBBY_EVENTS.state, (lobby) => useLobbyStore.getState().setLobby(lobby));
    socket.on(LOBBY_EVENTS.invite, (invite) => useLobbyStore.getState().addInvite(invite));

    socket.on(LOBBY_EVENTS.declined, ({ player }) => {
      toast(`${player.playerName} hat abgelehnt`);
    });

    socket.on(LOBBY_EVENTS.messages, (messages) => useLobbyStore.getState().setMessages(messages));
    socket.on(LOBBY_EVENTS.message, (message) => useLobbyStore.getState().addMessage(message));

    socket.on(LOBBY_EVENTS.start, ({ song }) => useLobbyStore.getState().startRound(song));
    socket.on(LOBBY_EVENTS.scores, (scores) => useLobbyStore.getState().setScores(scores));
    socket.on(LOBBY_EVENTS.results, (result) => useLobbyStore.getState().setResult(result));

    // Der Verbindungsaufbau zwischen zwei Browsern — hier nur durchgereicht.
    socket.on(RTC_EVENTS.signal, ({ from, signal }) => handleSignal(from, signal));

    // Was der Server nicht sehen kann: ob hier gerade gesungen wird. Beim Verbinden einmal,
    // danach bei jedem Wechsel.
    const reportActivity = () => {
      socket.emit(REALTIME_EVENTS.activity, currentActivity());
    };

    socket.on("connect", reportActivity);
    const stopWatching = usePlayerStore.subscribe(reportActivity);
    reportRef.current = reportActivity;

    setSocket(socket);

    return () => {
      reportRef.current = undefined;
      stopWatching();
      setSocket(undefined);
      socket.close();
      useRealtimeStore.getState().reset();
      useLobbyStore.getState().reset();
    };
  }, [userId, queryClient]);

  // Ein Seitenwechsel ändert die Tätigkeit — die Songübersicht ist etwas anderes als das Menü.
  useEffect(() => {
    reportRef.current?.();
  }, [pathname]);

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

/**
 * Was der Server nicht selbst sehen kann.
 *
 * Die Lobby lässt er ausdrücklich weg — die kennt er besser als wir, und seine Angabe hat
 * Vorrang.
 */
function currentActivity(): Activity {
  if (usePlayerStore.getState().mode === "play") return "singing";
  return window.location.pathname.startsWith("/songs") ? "library" : "browsing";
}

function showEvent({ kind, event }: QueuedEvent) {
  const name = event.player.playerName;

  if (kind === "request") toast(`${name} möchte dich hinzufügen`);
  else toast(`${name} ist jetzt dein Freund`);
}
