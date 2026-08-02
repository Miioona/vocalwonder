"use client";

import { useState } from "react";

import type { FriendEntry, FriendStatus, PlayerSearchResult } from "@vocalwonder/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth/auth-client";
import { useFriendActions, useFriends, usePlayerSearch } from "@/lib/friends/use-friends";
import { useMyProfile } from "@/lib/profile/use-profile";
import { useDebounced } from "@/lib/use-debounced";

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

  const searching = debouncedQuery.trim().length >= 2;

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
  onAdd?: () => void;
  onAccept?: () => void;
  onRemove?: () => void;
}

/** Eine Zeile für alle Fälle — welche Knöpfe erscheinen, entscheidet der Status. */
const PlayerRow = ({ player, busy, onAdd, onAccept, onRemove }: PlayerRowProps) => (
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

    <span className="min-w-0 flex-1 truncate text-sm">{player.playerName}</span>

    <span className="flex shrink-0 gap-1">
      {player.status === "none" && onAdd && (
        <Button size="sm" disabled={busy} onClick={onAdd}>
          Hinzufügen
        </Button>
      )}

      {player.status === "incoming" && onAccept && (
        <Button size="sm" disabled={busy} onClick={onAccept}>
          Annehmen
        </Button>
      )}

      {onRemove && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
          {removeLabel(player.status)}
        </Button>
      )}
    </span>
  </div>
);

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
