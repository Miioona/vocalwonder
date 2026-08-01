"use client";

import { useState } from "react";

import { ScoreHistory } from "@/components/settings/sections/score-history";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "@/lib/auth/auth-client";

/**
 * Anmeldung über Google oder Discord.
 *
 * Ohne Konto bleibt die App voll nutzbar — Musik und Analyse liegen ohnehin auf dem Gerät.
 * Ein Konto sichert Ergebnisse und später die Favoriten.
 */
export const AccountSettings = () => {
  const { data: session, isPending } = useSession();
  const [busy, setBusy] = useState(false);

  const login = async (provider: "google" | "discord") => {
    setBusy(true);
    try {
      // Nach dem Rücksprung von Google oder Discord landet der Browser wieder hier.
      await signIn.social({ provider, callbackURL: window.location.origin });
    } finally {
      setBusy(false);
    }
  };

  if (isPending) {
    return <p className="text-sm text-muted-foreground">lädt …</p>;
  }

  if (session) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {session.user.image ? (
            // Kein next/image: Die Bilder liegen bei Google und Discord.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </div>

        <div>
          <Button variant="outline" onClick={() => void signOut()}>
            Abmelden
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Verlauf
          </h3>
          <ScoreHistory />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Melde dich an, um deine Ergebnisse zu sichern. Zum Spielen brauchst du kein Konto.
      </p>

      <div className="flex flex-col gap-2">
        <Button disabled={busy} onClick={() => void login("google")}>
          Mit Google anmelden
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void login("discord")}>
          Mit Discord anmelden
        </Button>
      </div>
    </div>
  );
};
