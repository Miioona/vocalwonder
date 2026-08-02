"use client";

import { useState } from "react";

import { PLAYER_NAME_MAX, PLAYER_NAME_MIN, PLAYER_NAME_PATTERN } from "@vocalwonder/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkPlayerName, useMyProfile, useSetPlayerName } from "@/lib/profile/use-profile";
import { cn } from "@/lib/utils";

/**
 * Der Name, unter dem man gefunden wird und in Bestenlisten steht.
 *
 * Getrennt vom Namen bei Google oder Discord: Der ändert sich, wann immer der User ihn dort
 * ändert, und zweimal "Fabian" wäre in einer Freundesliste nicht auseinanderzuhalten.
 */
export const PlayerName = () => {
  const { data: profile, isPending } = useMyProfile();
  const setPlayerName = useSetPlayerName();

  const [draft, setDraft] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  // Solange nichts getippt wurde, steht der gespeicherte Name im Feld.
  const value = draft ?? profile?.playerName ?? "";
  const trimmed = value.trim();

  const wellFormed =
    trimmed.length >= PLAYER_NAME_MIN &&
    trimmed.length <= PLAYER_NAME_MAX &&
    PLAYER_NAME_PATTERN.test(trimmed);

  const unchanged = trimmed === profile?.playerName;
  const isTaken = taken !== null && taken === trimmed.toLowerCase();

  const hint = (() => {
    if (setPlayerName.isSuccess && unchanged) return { text: "Gespeichert", tone: "ok" } as const;
    if (isTaken) return { text: "Schon vergeben", tone: "bad" } as const;
    if (trimmed.length > 0 && !wellFormed) {
      return {
        text: `${PLAYER_NAME_MIN}–${PLAYER_NAME_MAX} Zeichen, Buchstaben, Ziffern, _ und -`,
        tone: "bad",
      } as const;
    }
    if (!profile) return { text: "Für Freunde und Bestenlisten", tone: "muted" } as const;
    return null;
  })();

  // Beim Verlassen des Feldes prüfen, nicht bei jedem Zeichen — das wären zehn Anfragen je Name.
  const check = () => {
    if (!wellFormed || unchanged) return;

    void checkPlayerName(trimmed)
      .then(({ available }) => setTaken(available ? null : trimmed.toLowerCase()))
      .catch((error: unknown) => console.error("[profile]", error));
  };

  const save = () => {
    setPlayerName.mutate(trimmed, {
      onSuccess: () => setDraft(null),
      onError: (error) => {
        // 409 vom Server: zwischen Prüfung und Speichern war jemand schneller.
        setTaken(trimmed.toLowerCase());
        console.error("[profile]", error);
      },
    });
  };

  if (isPending) return <p className="text-sm text-muted-foreground">lädt …</p>;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="player-name">Spielername</Label>

      <div className="flex gap-2">
        <Input
          id="player-name"
          value={value}
          maxLength={PLAYER_NAME_MAX}
          placeholder=""
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
            setTaken(null);
          }}
          onBlur={check}
        />

        <Button
          disabled={!wellFormed || unchanged || isTaken || setPlayerName.isPending}
          onClick={save}
        >
          Speichern
        </Button>
      </div>

      {hint && (
        <p
          className={cn(
            "text-xs",
            hint.tone === "bad" && "text-destructive",
            hint.tone === "ok" && "text-primary",
            hint.tone === "muted" && "text-muted-foreground",
          )}
        >
          {hint.text}
        </p>
      )}
    </div>
  );
};
