import type { Activity, FriendEvent, PresenceEntry } from "@vocalwonder/core";
import { create } from "zustand";

export type ConnectionStatus = "offline" | "connecting" | "online";

/** Ein Ereignis, das der User sehen soll — mit der Art, damit der Text dazu passt. */
export interface QueuedEvent {
  kind: "request" | "accepted";
  event: FriendEvent;
}

interface RealtimeState {
  status: ConnectionStatus;
  /** Freunde, die gerade verbunden sind — mit dem, was sie tun. */
  online: PresenceEntry[];
  /** Ereignisse, die während des Singens eingetroffen sind. */
  queued: QueuedEvent[];

  setStatus: (status: ConnectionStatus) => void;
  setOnline: (online: PresenceEntry[]) => void;
  setPresence: (userId: string, online: boolean, activity?: Activity) => void;
  queue: (item: QueuedEvent) => void;
  drain: () => QueuedEvent[];
  reset: () => void;
}

/**
 * Was die offene Verbindung an Wissen mitbringt.
 *
 * Getrennt von der Freundesliste, die weiterhin über REST kommt: Die Liste sagt, **wer**
 * meine Freunde sind, die Verbindung sagt, **wer davon gerade da ist**. Zusammengeführt wird
 * erst in der Anzeige — dann bleibt die Liste auch nutzbar, wenn keine Verbindung steht.
 */
export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  status: "offline",
  online: [],
  queued: [],

  setStatus: (status) => set({ status }),
  setOnline: (online) => set({ online }),

  setPresence: (userId, online, activity = "browsing") =>
    set((state) => {
      const without = state.online.filter((entry) => entry.userId !== userId);
      return { online: online ? [...without, { userId, activity }] : without };
    }),

  queue: (item) => set((state) => ({ queued: [...state.queued, item] })),

  drain: () => {
    const { queued } = get();
    if (queued.length > 0) set({ queued: [] });
    return queued;
  },

  reset: () => set({ status: "offline", online: [], queued: [] }),
}));
