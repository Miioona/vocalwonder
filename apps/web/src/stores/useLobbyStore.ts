import type { LobbyInvite, LobbyMessage, LobbyState } from "@vocalwonder/core";
import { create } from "zustand";

interface LobbyStoreState {
  /** Die Lobby, in der ich sitze — oder `null`. Kommt vom Server, nie von hier. */
  lobby: LobbyState | null;
  /**
   * Ob der Server sich schon geäußert hat.
   *
   * Nötig, weil "verbunden" und "Stand bekannt" zwei verschiedene Zeitpunkte sind: Die
   * Verbindung steht einen Moment früher als die erste Antwort. Ohne diese Unterscheidung
   * sähe die Lobby-Seite kurz "verbunden, keine Lobby" und würde weiterleiten — genau beim
   * Neuladen innerhalb einer Lobby.
   */
  known: boolean;
  /** Einladungen, die auf meine Antwort warten. */
  invites: LobbyInvite[];
  /** Der Chatverlauf der Lobby. */
  messages: LobbyMessage[];
  /** Nachrichten, die seit dem letzten Blick in den Chat dazugekommen sind. */
  unread: number;

  setLobby: (lobby: LobbyState | null) => void;
  setMessages: (messages: LobbyMessage[]) => void;
  addMessage: (message: LobbyMessage) => void;
  clearUnread: () => void;
  addInvite: (invite: LobbyInvite) => void;
  removeInvite: (code: string) => void;
  reset: () => void;
}

/**
 * Der Lobby-Stand im Browser — ein Abbild dessen, was der Server sagt.
 *
 * Hier wird nichts entschieden: Wer drin ist, wer Gastgeber ist, wer eingeladen wurde, legt
 * allein der Server fest. Das erspart zwei Wahrheiten, die auseinanderlaufen können.
 */
export const useLobbyStore = create<LobbyStoreState>((set) => ({
  lobby: null,
  known: false,
  invites: [],
  messages: [],
  unread: 0,

  setLobby: (lobby) =>
    // Ohne Lobby gibt es auch keinen Verlauf mehr — sonst stünde er in der nächsten drin.
    set(lobby ? { lobby, known: true } : { lobby: null, known: true, messages: [], unread: 0 }),

  setMessages: (messages) => set({ messages, unread: 0 }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message], unread: state.unread + 1 })),
  clearUnread: () => set({ unread: 0 }),

  addInvite: (invite) =>
    set((state) => ({
      invites: state.invites.some((item) => item.code === invite.code)
        ? state.invites
        : [...state.invites, invite],
    })),

  removeInvite: (code) =>
    set((state) => ({ invites: state.invites.filter((invite) => invite.code !== code) })),

  reset: () => set({ lobby: null, known: false, invites: [], messages: [], unread: 0 }),
}));
