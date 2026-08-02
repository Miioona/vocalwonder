import type { FriendEntry, FriendList, FriendStatus, PlayerSearchResult } from "@vocalwonder/core";
import { normalizePlayerName } from "@vocalwonder/core";

import { ProfileModel } from "../profile/profile.model.js";
import { findUserIdByEmail, getUserImages } from "../profile/user-lookup.js";
import { FriendshipModel, pairKeyFor } from "./friend.model.js";

/** Fehler, die keine Panne sind, sondern eine Antwort verdienen — der Controller übersetzt sie. */
export class FriendActionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "FriendActionError";
  }
}

interface FriendshipDoc {
  requesterId: string;
  addresseeId: string;
  status: string;
  acceptedAt?: Date;
  createdAt: Date;
}

function statusFor(doc: FriendshipDoc, meId: string): FriendStatus {
  if (doc.status === "accepted") return "friends";
  return doc.requesterId === meId ? "outgoing" : "incoming";
}

function otherIdOf(doc: FriendshipDoc, meId: string): string {
  return doc.requesterId === meId ? doc.addresseeId : doc.requesterId;
}

/** Alle Beziehungen, an denen ich beteiligt bin. */
async function myFriendships(meId: string): Promise<FriendshipDoc[]> {
  const docs = await FriendshipModel.find({
    $or: [{ requesterId: meId }, { addresseeId: meId }],
  }).lean();

  return docs as unknown as FriendshipDoc[];
}

/**
 * Namen und Bilder zu einer Menge von Konten.
 *
 * Wer noch keinen Spielernamen gesetzt hat, taucht nirgends auf — weder in der Suche noch in
 * einer Liste. Ohne Namen gäbe es nichts anzuzeigen außer einer ID.
 */
async function loadPlayers(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { playerName: string; image?: string }>();

  const [profiles, images] = await Promise.all([
    ProfileModel.find({ userId: { $in: userIds } }).lean(),
    getUserImages(userIds),
  ]);

  const players = new Map<string, { playerName: string; image?: string }>();
  for (const profile of profiles) {
    players.set(profile.userId, {
      playerName: profile.playerName,
      image: images.get(profile.userId),
    });
  }
  return players;
}

export async function getFriendList(meId: string): Promise<FriendList> {
  const docs = await myFriendships(meId);
  const players = await loadPlayers(docs.map((doc) => otherIdOf(doc, meId)));

  const list: FriendList = { friends: [], incoming: [], outgoing: [] };

  for (const doc of docs) {
    const otherId = otherIdOf(doc, meId);
    const player = players.get(otherId);
    if (!player) continue;

    const status = statusFor(doc, meId);
    const entry: FriendEntry = {
      userId: otherId,
      playerName: player.playerName,
      image: player.image,
      status,
      since: (doc.acceptedAt ?? doc.createdAt).toISOString(),
    };

    if (status === "friends") list.friends.push(entry);
    else if (status === "incoming") list.incoming.push(entry);
    else list.outgoing.push(entry);
  }

  list.friends.sort((a, b) => a.playerName.localeCompare(b.playerName, "de"));
  return list;
}

/**
 * Suche nach Spielername oder E-Mail.
 *
 * Der Name wird als Präfix gesucht ("fab" findet "Fabian"), die E-Mail **nur exakt**: Bei
 * Teiltreffern ließe sich durch die Adressen tasten und herausfinden, wer hier ein Konto hat.
 * Die Adresse selbst steht in keiner Antwort.
 */
export async function searchPlayers(meId: string, query: string): Promise<PlayerSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  let userIds: string[];

  if (trimmed.includes("@")) {
    const found = await findUserIdByEmail(trimmed);
    userIds = found ? [found] : [];
  } else {
    // Escapen, damit Eingaben wie "a.*" nicht als Ausdruck gelesen werden.
    const prefix = normalizePlayerName(trimmed).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const profiles = await ProfileModel.find({ playerNameLower: new RegExp(`^${prefix}`) })
      .limit(10)
      .lean();

    userIds = profiles.map((profile) => profile.userId);
  }

  userIds = userIds.filter((id) => id !== meId);

  const [players, docs] = await Promise.all([loadPlayers(userIds), myFriendships(meId)]);
  const byOther = new Map(docs.map((doc) => [otherIdOf(doc, meId), doc]));

  return userIds.flatMap((userId) => {
    const player = players.get(userId);
    if (!player) return [];

    const doc = byOther.get(userId);
    return [
      {
        userId,
        playerName: player.playerName,
        image: player.image,
        status: doc ? statusFor(doc, meId) : ("none" as FriendStatus),
      },
    ];
  });
}

/**
 * Anfrage stellen.
 *
 * Sonderfall: Hat der andere mich bereits angefragt, wird daraus sofort eine Freundschaft —
 * beide wollen es ja, es wäre albern, ihn dann noch auf einen Knopf warten zu lassen.
 */
export async function sendRequest(meId: string, targetId: string): Promise<FriendStatus> {
  if (meId === targetId) {
    throw new FriendActionError("SELF_REQUEST", "Man kann sich nicht selbst hinzufügen.");
  }

  const profile = await ProfileModel.findOne({ userId: targetId }).lean();
  if (!profile) throw new FriendActionError("NOT_FOUND", "Spieler nicht gefunden.", 404);

  const existing = await FriendshipModel.findOne({ pairKey: pairKeyFor(meId, targetId) });

  if (existing) {
    const status = statusFor(existing.toObject() as unknown as FriendshipDoc, meId);
    if (status === "incoming") return acceptRequest(meId, targetId);
    return status;
  }

  await FriendshipModel.create({
    requesterId: meId,
    addresseeId: targetId,
    pairKey: pairKeyFor(meId, targetId),
    status: "pending",
  });

  return "outgoing";
}

/** Nur der Angefragte darf annehmen — sonst könnte man sich selbst zum Freund erklären. */
export async function acceptRequest(meId: string, otherId: string): Promise<FriendStatus> {
  const updated = await FriendshipModel.findOneAndUpdate(
    { pairKey: pairKeyFor(meId, otherId), addresseeId: meId, status: "pending" },
    { status: "accepted", acceptedAt: new Date() },
    { new: true },
  );

  if (!updated) throw new FriendActionError("NOT_FOUND", "Keine offene Anfrage.", 404);
  return "friends";
}

/** Deckt drei Fälle ab: ablehnen, eigene Anfrage zurückziehen, Freundschaft beenden. */
export async function removeFriendship(meId: string, otherId: string): Promise<void> {
  const deleted = await FriendshipModel.findOneAndDelete({
    pairKey: pairKeyFor(meId, otherId),
    $or: [{ requesterId: meId }, { addresseeId: meId }],
  });

  if (!deleted) throw new FriendActionError("NOT_FOUND", "Nichts zu entfernen.", 404);
}
