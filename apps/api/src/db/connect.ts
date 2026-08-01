import mongoose from "mongoose";
import type { Db } from "mongodb";

import { env } from "../config/env.js";

/**
 * Eine Verbindung für beides: Unsere eigenen Sammlungen laufen über Mongoose, better-auth
 * verwaltet seine eigenen und will dafür den nativen Treiber. Mongoose bringt den Treiber
 * ohnehin mit — also holen wir ihn uns von dort, statt eine zweite Verbindung aufzumachen.
 */
export async function connectToDatabase(): Promise<void> {
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("[db] connected to MongoDB");
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("[db] disconnected from MongoDB");
}

/** Der native Treiber hinter der Mongoose-Verbindung. Erst nach `connectToDatabase` gültig. */
export function nativeDb(): Db {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database is not connected");
  return db;
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
