import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import mongoose from "mongoose";

import { env } from "../../config/env.js";
import { nativeDb } from "../../db/connect.js";

/**
 * Anmeldung über better-auth.
 *
 * Fällt aus dem übrigen Modulmuster (routes/controller/service/model), weil die Bibliothek
 * ihren eigenen Handler mitbringt und ihre eigenen Sammlungen verwaltet — Nutzer, Sitzungen,
 * verknüpfte Konten. Die lassen wir in Ruhe; unsere Daten liegen in eigenen Sammlungen
 * daneben und verweisen per Nutzer-ID darauf.
 *
 * Nur Google und Discord: Ohne E-Mail-Anmeldung brauchen wir weder Postversand noch
 * Passwort-Zurücksetzen.
 */
// Kein `ReturnType<typeof betterAuth>`: Der Typ hängt an den übergebenen Einstellungen,
// die allgemeine Fassung passt nicht auf die konkrete.
function createAuth() {
  return betterAuth({
    // Transaktionen aus: Ein einzelner MongoDB-Server ohne Replikat-Satz kann sie nicht,
    // und für Anmeldevorgänge brauchen wir sie nicht.
    database: mongodbAdapter(nativeDb(), {
      client: mongoose.connection.getClient(),
      transaction: false,
    }),

    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    // Das Frontend läuft auf einer anderen Adresse und schickt Cookies mit.
    trustedOrigins: [env.WEB_ORIGIN],

    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {}),
      ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
        ? {
            discord: {
              clientId: env.DISCORD_CLIENT_ID,
              clientSecret: env.DISCORD_CLIENT_SECRET,
            },
          }
        : {}),
    },

    account: {
      // Wer sich einmal mit Google und einmal mit Discord anmeldet, soll derselbe Mensch
      // bleiben, solange die E-Mail übereinstimmt.
      accountLinking: { enabled: true, trustedProviders: ["google", "discord"] },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/** Erst nach `connectToDatabase()` aufrufen — der Adapter braucht die offene Verbindung. */
export function getAuth(): Auth {
  if (!instance) instance = createAuth();
  return instance;
}
