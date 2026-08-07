import type { Activity, PresenceEntry } from "@vocalwonder/core";

import { getLobbyOfUser } from "../modules/lobby/lobby.store.js";

/**
 * Wer gerade verbunden ist und was er tut — im Arbeitsspeicher.
 *
 * Ein Nutzer kann mehrere Verbindungen haben (zwei Tabs, Telefon daneben), deshalb wird
 * gezählt und nicht bloß gemerkt. Offline ist jemand erst, wenn die **letzte** Verbindung
 * geht — sonst würde ein zweiter Tab beim Schließen den ersten für offline erklären.
 *
 * **Grenze:** Das gilt nur innerhalb eines Serverprozesses. Sobald mehrere laufen, kennt
 * jeder nur seine eigenen Verbindungen; dann braucht es Redis dazwischen. Auf der
 * Gratisstufe von Render gibt es genau einen Prozess, deshalb reicht es vorerst.
 */
interface Connected {
  count: number;
  /** Was der Browser gemeldet hat. Was der Server besser weiß, kommt in `activityOf` dazu. */
  reported: Activity;
}

const connections = new Map<string, Connected>();

/** Meldet an, ob dies die **erste** Verbindung dieses Nutzers ist. */
export function addConnection(userId: string): boolean {
  const entry = connections.get(userId);

  if (!entry) {
    connections.set(userId, { count: 1, reported: "browsing" });
    return true;
  }

  entry.count += 1;
  return false;
}

/** Meldet an, ob dies die **letzte** Verbindung dieses Nutzers war. */
export function removeConnection(userId: string): boolean {
  const entry = connections.get(userId);
  if (!entry) return true;

  if (entry.count <= 1) {
    connections.delete(userId);
    return true;
  }

  entry.count -= 1;
  return false;
}

/** Was der Browser meldet — "im Menü" oder "singt". Alles andere weiß der Server selbst. */
export function setReportedActivity(userId: string, activity: Activity): void {
  const entry = connections.get(userId);
  if (entry) entry.reported = activity;
}

/**
 * Die tatsächliche Tätigkeit.
 *
 * Die Lobby schlägt die Meldung des Browsers: Wer in einer Lobby sitzt, ist dort — auch wenn
 * sein Tab etwas anderes behauptet.
 */
export function activityOf(userId: string): Activity {
  if (getLobbyOfUser(userId)) return "lobby";
  return connections.get(userId)?.reported ?? "browsing";
}

export function isOnline(userId: string): boolean {
  return connections.has(userId);
}

export function onlineAmong(userIds: string[]): PresenceEntry[] {
  return userIds.filter(isOnline).map((userId) => ({ userId, activity: activityOf(userId) }));
}
