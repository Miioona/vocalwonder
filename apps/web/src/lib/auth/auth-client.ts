"use client";

import { createAuthClient } from "better-auth/react";

import { CONFIG } from "@/lib/config/config";

/**
 * Zugang zur Anmeldung im Backend.
 *
 * `credentials: "include"` ist entscheidend: Das Sitzungs-Cookie kommt von einer anderen
 * Adresse (`localhost:8000` gegen `localhost:3000`), und ohne diese Angabe schickt der
 * Browser es nicht mit. Dass beide auf `localhost` liegen, macht sie für die Cookie-Regeln
 * zur selben Seite — später gilt dasselbe für `app.domain` und `api.domain`.
 */
export const authClient = createAuthClient({
  baseURL: CONFIG.API.BASE_URL,
  fetchOptions: { credentials: "include" },
});

export const { signIn, signOut, useSession } = authClient;
