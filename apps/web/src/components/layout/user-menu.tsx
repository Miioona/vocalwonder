"use client";

import { useState } from "react";

import { SettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signIn, signOut, useSession } from "@/lib/auth/auth-client";
import { useMyProfile } from "@/lib/profile/use-profile";
import { useMyScores } from "@/lib/scores/use-my-scores";

/**
 * Wer bin ich, wie gut bin ich, und wo geht es zu den Einstellungen — oben rechts, wie in
 * jedem Spiel. Ohne Anmeldung steht dort nur ein Knopf; die Einstellungen sind trotzdem
 * erreichbar, denn Audio und Darstellung brauchen kein Konto.
 */
export const UserMenu = () => {
  const { data: session, isPending } = useSession();
  const { data: profile } = useMyProfile();
  const { data: scores } = useMyScores();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totalPoints = scores?.reduce((sum, score) => sum + score.points, 0) ?? 0;
  const name = profile?.playerName ?? session?.user.name ?? "";

  // Nach dem Rücksprung vom Anbieter landet der Browser wieder hier.
  const login = (provider: "google" | "discord") =>
    signIn.social({ provider, callbackURL: window.location.href });

  return (
    <>
      {isPending ? (
        <span className="h-9 w-24" />
      ) : session ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-muted"
              >
                <Avatar image={session.user.image} name={name} />

                <span className="hidden text-left leading-tight sm:block">
                  <span className="block max-w-32 truncate text-sm font-medium">{name}</span>
                  <span className="block font-mono text-xs text-muted-foreground tabular-nums">
                    {totalPoints.toLocaleString("de-DE")}
                  </span>
                </span>
              </button>
            }
          />

          <DropdownMenuContent align="end" className="w-48">
            {/* Base UI erwartet den Label innerhalb einer Gruppe — frei stehend wirft er. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>Einstellungen</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>Abmelden</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm">Anmelden</Button>} />

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void login("google")}>Mit Google</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void login("discord")}>Mit Discord</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Einstellungen"
            onClick={() => setSettingsOpen(true)}
          >
            <GearIcon />
          </Button>
        </div>
      )}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
};

const Avatar = ({ image, name }: { image?: string | null; name: string }) =>
  image ? (
    // Kein next/image: Die Bilder liegen bei Google und Discord.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
      {name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.6.77 1 1.41 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
