import type { ScoreSnapshot } from "@vocalwonder/core";
import type {
  LobbyInvite,
  LobbyMessage,
  LobbyScore,
  LobbyState,
  QueuedSong,
  RoundResult,
} from "@vocalwonder/core";

import type { AudioFile } from "@/lib/song-explorer/types";
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
  /** Der Song, der gerade läuft — oder `null` zwischen den Runden. */
  round: QueuedSong | null;
  /** Punktestände des laufenden Songs, vom Server verteilt. */
  scores: LobbyScore[];
  /** Mein eigener Stand am Ende des Songs — der Endbildschirm speichert ihn. */
  mySnapshot: ScoreSnapshot | null;
  /** Das Ergebnis des zuletzt gesungenen Songs — steht bis zum Verlassen des Endbildschirms. */
  result: RoundResult | null;
  /**
   * Meine eigenen Dateien zu den Songs, die ich eingestellt habe.
   *
   * Nur hier im Speicher: Ein Dateizugriff lässt sich nicht in die Lobby schicken. Beim
   * Neuladen ist die Zuordnung weg — dann kann ich meinen eigenen Song nicht abspielen und
   * muss ihn neu einstellen.
   */
  ownFiles: Record<string, AudioFile>;

  setLobby: (lobby: LobbyState | null) => void;
  setMessages: (messages: LobbyMessage[]) => void;
  addMessage: (message: LobbyMessage) => void;
  clearUnread: () => void;
  setScores: (scores: LobbyScore[]) => void;
  setMySnapshot: (snapshot: ScoreSnapshot) => void;
  setResult: (result: RoundResult) => void;
  clearResult: () => void;
  startRound: (song: QueuedSong) => void;
  endRound: () => void;
  rememberFile: (songHash: string, file: AudioFile) => void;
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
  round: null,
  scores: [],
  mySnapshot: null,
  result: null,
  ownFiles: {},

  setLobby: (lobby) =>
    // Ohne Lobby gibt es auch keinen Verlauf mehr — sonst stünde er in der nächsten drin.
    set(
      lobby
        ? { lobby, known: true }
        : { lobby: null, known: true, messages: [], unread: 0, round: null, result: null },
    ),

  setMessages: (messages) => set({ messages, unread: 0 }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message], unread: state.unread + 1 })),
  clearUnread: () => set({ unread: 0 }),

  setScores: (scores) => set({ scores }),
  setMySnapshot: (mySnapshot) => set({ mySnapshot }),
  // Ein neuer Song räumt das alte Ergebnis weg.
  startRound: (song) => set({ round: song, scores: [], result: null, mySnapshot: null }),
  setResult: (result) => set({ result, round: null }),
  clearResult: () => set({ result: null }),
  endRound: () => set({ round: null }),
  rememberFile: (songHash, file) =>
    set((state) => ({ ownFiles: { ...state.ownFiles, [songHash]: file } })),

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
