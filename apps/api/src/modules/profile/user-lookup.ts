import { ObjectId } from "mongodb";

import { nativeDb } from "../../db/connect.js";

/**
 * Lesender Blick in die `user`-Sammlung von better-auth.
 *
 * Geschrieben wird dort nichts — das bleibt Sache der Bibliothek. Gebraucht wird es für zwei
 * Dinge, die nur dort stehen: die E-Mail (für die Suche) und das Bild vom Anbieter.
 *
 * better-auth legt `_id` als ObjectId an und reicht es als Zeichenkette nach außen. Deshalb
 * hier hin und zurück umgewandelt.
 */
interface AuthUser {
  _id: ObjectId;
  email: string;
  name?: string;
  image?: string;
}

function collection() {
  return nativeDb().collection<AuthUser>("user");
}

function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

/** Findet ein Konto über die genaue E-Mail. Keine Teiltreffer — siehe `searchPlayers`. */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const doc = await collection().findOne(
    { email: email.trim().toLowerCase() },
    { projection: { _id: 1 } },
  );

  return doc ? String(doc._id) : null;
}

/** Profilbilder von Google oder Discord, für die Freundesliste. */
export async function getUserImages(userIds: string[]): Promise<Map<string, string>> {
  const ids = userIds.map(toObjectId).filter((id): id is ObjectId => id !== null);
  if (ids.length === 0) return new Map();

  const docs = await collection()
    .find({ _id: { $in: ids } }, { projection: { _id: 1, image: 1 } })
    .toArray();

  const images = new Map<string, string>();
  for (const doc of docs) {
    if (doc.image) images.set(String(doc._id), doc.image);
  }
  return images;
}
