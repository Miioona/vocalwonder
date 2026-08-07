"use client";

import { useState } from "react";

import type { Activity, FriendEntry, FriendStatus, PlayerSearchResult } from "@vocalwonder/core";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth/auth-client";
import { useFriendActions, useFriends, usePlayerSearch } from "@/lib/friends/use-friends";
import { useMyProfile } from "@/lib/profile/use-profile";
import { useDebounced } from "@/lib/use-debounced";
import { lobbyCommands } from "@/lib/realtime/socket";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { useRealtimeStore } from "@/stores/useRealtimeStore";

/**
 * Freunde suchen, Anfragen beantworten, Liste sehen. Sitzt in der Leiste rechts.
 *
 * Gesucht wird über den Spielernamen oder die genaue E-Mail. Wer selbst noch keinen Namen hat,
 * ist für andere unsichtbar — deshalb steht hier zuerst der Hinweis darauf.
 */
export const FriendsList = () => {
  const { data: session } = useSession();
  const { data: profile } = useMyProfile();
  const { data: list, isPending } = useFriends();
  const { request, accept, remove } = useFriendActions();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query);
  const { data: results, isFetching } = usePlayerSearch(debouncedQuery);
  const lobby = useLobbyStore((state) => state.lobby);

  if (!session) {
    return <p className="text-sm text-muted-foreground">Melde dich an, um Freunde zu finden.</p>;
  }

  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">
        Setze zuerst unter „Konto&ldquo; einen Spielernamen. Ohne Namen findet dich niemand.
      </p>
    );
  }

  // Wer Gast in einer fremden Lobby ist, lädt niemanden ein — das darf nur der Gastgeber.
  const hostable = !lobby || lobby.hostId === session.user.id;

  const searching = debouncedQuery.trim().length >= 2;

  // Der Grund einer Absage kommt vom Server — "gerade nicht da", "sitzt schon in einer Lobby".
  const invite = async (userId: string) => {
    const result = await lobbyCommands.invite(userId);
    if (!result.ok) toast(result.message ?? "Einladung nicht möglich");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Input
          value={query}
          placeholder="Spielername oder E-Mail"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />

        {searching && (
          <div className="flex flex-col">
            {isFetching && !results && <Hint>sucht …</Hint>}
            {results?.length === 0 && <Hint>Niemanden gefunden.</Hint>}

            {results?.map((player) => (
              <PlayerRow
                key={player.userId}
                player={player}
                busy={request.isPending}
                onAdd={() => request.mutate(player.userId)}
                onAccept={() => accept.mutate(player.userId)}
              />
            ))}
          </div>
        )}
      </div>

      {isPending && <Hint>lädt …</Hint>}

      {list && list.incoming.length > 0 && (
        <Group title="Anfragen">
          {list.incoming.map((entry) => (
            <PlayerRow
              key={entry.userId}
              player={entry}
              busy={accept.isPending || remove.isPending}
              onAccept={() => accept.mutate(entry.userId)}
              onRemove={() => remove.mutate(entry.userId)}
            />
          ))}
        </Group>
      )}

      {list && list.outgoing.length > 0 && (
        <Group title="Gesendet">
          {list.outgoing.map((entry) => (
            <PlayerRow
              key={entry.userId}
              player={entry}
              busy={remove.isPending}
              onRemove={() => remove.mutate(entry.userId)}
            />
          ))}
        </Group>
      )}

      {list && (
        <Group title="Freunde">
          {list.friends.length === 0 ? (
            <Hint>Noch niemand. Such oben nach einem Namen.</Hint>
          ) : (
            list.friends.map((entry) => (
              <PlayerRow
                key={entry.userId}
                player={entry}
                busy={remove.isPending}
                hostable={hostable}
                onInvite={() => void invite(entry.userId)}
                onRemove={() => remove.mutate(entry.userId)}
              />
            ))
          )}
        </Group>
      )}
    </div>
  );
};

interface PlayerRowProps {
  player: PlayerSearchResult | FriendEntry;
  busy: boolean;
  /** Ob ich gerade überhaupt jemanden einladen darf — als Gast einer fremden Lobby nicht. */
  hostable?: boolean;
  onAdd?: () => void;
  onAccept?: () => void;
  onInvite?: () => void;
  onRemove?: () => void;
}

/**
 * Eine Zeile für alle Fälle — welche Knöpfe erscheinen, entscheidet der Status.
 *
 * Der grüne Punkt kommt aus der offenen Verbindung, nicht aus der Liste: Die Liste sagt, wer
 * meine Freunde sind, die Verbindung sagt, wer davon gerade da ist.
 */
const PlayerRow = ({
  player,
  busy,
  hostable = false,
  onAdd,
  onAccept,
  onInvite,
  onRemove,
}: PlayerRowProps) => {
  const entry = useRealtimeStore((state) =>
    state.online.find((item) => item.userId === player.userId),
  );
  const online = Boolean(entry);

  // Einladen nur, wenn es gerade passt: nicht mitten im Song, nicht in einer fremden Lobby.
  const canInvite = (entry?.activity === "browsing" || entry?.activity === "library") && hostable;

  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-0">
      {player.image ? (
        // Kein next/image: Die Bilder liegen bei Google und Discord.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
          {player.playerName.slice(0, 1).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1 truncate">
        <span className="block truncate text-sm">
          {player.playerName}
          {online && (
            <span
              aria-label="online"
              className="ml-2 inline-block size-2 rounded-full bg-emerald-500 align-middle"
            />
          )}
        </span>

        {entry && (
          <span className="block truncate text-xs text-muted-foreground">
            {activityText(entry.activity)}
          </span>
        )}
      </span>

      <span className="flex shrink-0 gap-1">
        {player.status === "none" && onAdd && (
          <Button size="sm" disabled={busy} onClick={onAdd}>
            Hinzufügen
          </Button>
        )}

        {/* Kein Knopf, der immer eine Absage bringt: Wer singt oder schon in einer Lobby
            sitzt, wird nicht gestört — und wer selbst Gast einer fremden Lobby ist, darf
            ohnehin nicht einladen. */}
        {canInvite && onInvite && (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="In die Lobby einladen"
            title="In die Lobby einladen"
            disabled={busy}
            onClick={onInvite}
          >
            <InviteIcon />
          </Button>
        )}

        {player.status === "incoming" && onAccept && (
          <Button size="sm" disabled={busy} onClick={onAccept}>
            Annehmen
          </Button>
        )}

        {/* Bei Freunden liegt alles Weitere im Menü — dort kommen später Verlauf und
            Informationen dazu. Offene Anfragen bleiben ein sichtbarer Knopf: Sie wollen
            beantwortet werden, nicht gesucht. */}
        {onRemove &&
          (player.status === "friends" ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="icon-sm" variant="ghost" aria-label="Mehr" disabled={busy}>
                    <MoreIcon />
                  </Button>
                }
              />

              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onClick={onRemove}>
                  Entfernen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
              {removeLabel(player.status)}
            </Button>
          ))}
      </span>
    </div>
  );
};

/** Briefumschlag mit Pfeil — die übliche Geste für "Einladung raus". */
const InviteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-4"
    aria-hidden
  >
    <path d="M21 8.5V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9" />
    <path d="m3 7 9 6 4-2.7" />
    <path d="M19 2v6M22 5h-6" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

/** Was jemand gerade tut — kurz gehalten, es steht unter dem Namen. */
function activityText(activity: Activity): string {
  if (activity === "singing") return "singt gerade";
  if (activity === "lobby") return "in einer Lobby";
  if (activity === "library") return "in der Songübersicht";
  return "im Menü";
}

function removeLabel(status: FriendStatus): string {
  if (status === "incoming") return "Ablehnen";
  if (status === "outgoing") return "Zurückziehen";
  return "Entfernen";
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
    {children}
  </div>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="py-1 text-sm text-muted-foreground">{children}</p>
);
