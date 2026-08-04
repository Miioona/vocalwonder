import type { FriendEvent } from "@vocalwonder/core";
import { create } from "zustand";

export type ConnectionStatus = "offline" | "connecting" | "online";

/** Ein Ereignis, das der User sehen soll — mit der Art, damit der Text dazu passt. */
export interface QueuedEvent {
  kind: "request" | "accepted";
  event: FriendEvent;
}

interface RealtimeState {
  status: ConnectionStatus;
  /** Nutzer-IDs der Freunde, die gerade verbunden sind. */
  online: string[];
  /** Ereignisse, die während des Singens eingetroffen sind. */
  queued: QueuedEvent[];

  setStatus: (status: ConnectionStatus) => void;
  setOnline: (online: string[]) => void;
  setPresence: (userId: string, online: boolean) => void;
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

  setPresence: (userId, online) =>
    set((state) => ({
      online: online
        ? state.online.includes(userId)
          ? state.online
          : [...state.online, userId]
        : state.online.filter((id) => id !== userId),
    })),

  queue: (item) => set((state) => ({ queued: [...state.queued, item] })),

  drain: () => {
    const { queued } = get();
    if (queued.length > 0) set({ queued: [] });
    return queued;
  },

  reset: () => set({ status: "offline", online: [], queued: [] }),
}));
