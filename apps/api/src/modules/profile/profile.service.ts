import type { PlayerProfile, PublicPlayer } from "@vocalwonder/core";
import { normalizePlayerName } from "@vocalwonder/core";
import { MongoServerError } from "mongodb";

import { ProfileModel } from "./profile.model.js";
import { getUserImages } from "./user-lookup.js";

/** Der Name ist schon vergeben. Wird vom Controller in eine 409 übersetzt. */
export class PlayerNameTakenError extends Error {
  constructor() {
    super("Dieser Name ist schon vergeben.");
    this.name = "PlayerNameTakenError";
  }
}

export async function getProfile(userId: string): Promise<PlayerProfile | null> {
  const doc = await ProfileModel.findOne({ userId }).lean();
  return doc ? { userId: doc.userId, playerName: doc.playerName } : null;
}

/**
 * Legt den Spielernamen an oder ändert ihn.
 *
 * Die Eindeutigkeit entscheidet die Datenbank, nicht eine vorherige Abfrage: Zwischen "ist
 * frei?" und "dann nimm ihn" liegt ein Moment, in dem ihn jemand anderes bekommen kann.
 */
export async function setPlayerName(userId: string, playerName: string): Promise<PlayerProfile> {
  const playerNameLower = normalizePlayerName(playerName);

  try {
    const doc = await ProfileModel.findOneAndUpdate(
      { userId },
      { userId, playerName: playerName.trim(), playerNameLower },
      { upsert: true, new: true, lean: true },
    );

    // Mit `upsert` und `new` kommt immer ein Dokument zurück — der Typ weiß das nur nicht.
    if (!doc) throw new Error("Profil konnte nicht gespeichert werden.");

    return { userId: doc.userId, playerName: doc.playerName };
  } catch (err) {
    // 11000 = verletzter Eindeutigkeitsindex.
    if (err instanceof MongoServerError && err.code === 11000) throw new PlayerNameTakenError();
    throw err;
  }
}

/**
 * Wie andere einen Spieler sehen: Name aus unserem Profil, Bild vom Anbieter.
 *
 * Wer keinen Spielernamen gesetzt hat, fehlt in der Antwort — dann gäbe es nichts anzuzeigen
 * außer einer ID. Wird von Freundesliste, Ereignissen und Lobby gleichermaßen gebraucht,
 * deshalb liegt es hier und nicht in einem der drei.
 */
export async function getPublicPlayers(userIds: string[]): Promise<Map<string, PublicPlayer>> {
  const players = new Map<string, PublicPlayer>();
  if (userIds.length === 0) return players;

  const [profiles, images] = await Promise.all([
    ProfileModel.find({ userId: { $in: userIds } }).lean(),
    getUserImages(userIds),
  ]);

  for (const profile of profiles) {
    players.set(profile.userId, {
      userId: profile.userId,
      playerName: profile.playerName,
      image: images.get(profile.userId),
    });
  }

  return players;
}

export async function getPublicPlayer(userId: string): Promise<PublicPlayer | undefined> {
  return (await getPublicPlayers([userId])).get(userId);
}

/** Beim Trennen der letzten Verbindung. Fehlt ein Profil, gibt es nichts zu merken. */
export async function touchLastSeen(userId: string): Promise<void> {
  await ProfileModel.updateOne({ userId }, { lastSeenAt: new Date() });
}

/** Nur für die Rückmeldung beim Tippen — verbindlich ist erst das Speichern. */
export async function isPlayerNameAvailable(playerName: string, userId: string): Promise<boolean> {
  const doc = await ProfileModel.findOne({
    playerNameLower: normalizePlayerName(playerName),
  }).lean();

  // Der eigene Name ist für einen selbst immer frei.
  return !doc || doc.userId === userId;
}
