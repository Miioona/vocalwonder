/**
 * Wer gerade verbunden ist — im Arbeitsspeicher.
 *
 * Ein Nutzer kann mehrere Verbindungen haben (zwei Tabs, Telefon daneben), deshalb wird
 * gezählt und nicht bloß gemerkt. Offline ist jemand erst, wenn die **letzte** Verbindung
 * geht — sonst würde ein zweiter Tab beim Schließen den ersten für offline erklären.
 *
 * **Grenze:** Das gilt nur innerhalb eines Serverprozesses. Sobald mehrere laufen, kennt
 * jeder nur seine eigenen Verbindungen; dann braucht es Redis dazwischen. Auf der
 * Gratisstufe von Render gibt es genau einen Prozess, deshalb reicht es vorerst.
 */
const connections = new Map<string, number>();

/** Meldet an, ob dies die **erste** Verbindung dieses Nutzers ist. */
export function addConnection(userId: string): boolean {
  const count = connections.get(userId) ?? 0;
  connections.set(userId, count + 1);
  return count === 0;
}

/** Meldet an, ob dies die **letzte** Verbindung dieses Nutzers war. */
export function removeConnection(userId: string): boolean {
  const count = connections.get(userId) ?? 0;

  if (count <= 1) {
    connections.delete(userId);
    return true;
  }

  connections.set(userId, count - 1);
  return false;
}

export function isOnline(userId: string): boolean {
  return connections.has(userId);
}

export function onlineAmong(userIds: string[]): string[] {
  return userIds.filter(isOnline);
}
