"use client";

import type { LobbyState } from "@vocalwonder/core";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/song-explorer/audio-files";
import { lobbyCommands } from "@/lib/realtime/socket";

/**
 * Die Songs der Sitzung, in der Reihenfolge, in der gesungen wird.
 *
 * Eingestellt wird in der Bibliothek — dort steht die Musik ohnehin. Hier wird nur noch
 * sortiert und aussortiert.
 */
export const LobbyQueue = ({ lobby, meId }: { lobby: LobbyState; meId: string }) => {
  const isHost = lobby.hostId === meId;

  const run = async (action: Promise<{ ok: boolean; message?: string }>) => {
    const result = await action;
    if (!result.ok) toast(result.message ?? "Ging nicht");
  };

  if (lobby.queue.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Songs.</p>;
  }

  return (
    <ol className="flex flex-col">
      {lobby.queue.map((song, index) => {
        const owner = lobby.players.find((player) => player.userId === song.addedBy);
        const mayRemove = !lobby.locked && (isHost || song.addedBy === meId);

        return (
          <li
            key={song.id}
            className="flex items-center gap-2 border-b border-border py-2 last:border-0"
          >
            <span className="w-5 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
              {index + 1}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">
                {song.title}
                {!song.analysed && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    nicht analysiert
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {[song.artist, owner?.playerName, formatDuration(song.durationMs) || undefined]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>

            {/* Die Reihenfolge bestimmt allein der Gastgeber — sonst zieht jeder seinen Song
                nach vorn. */}
            {isHost && !lobby.locked && (
              <span className="flex shrink-0">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Nach oben"
                  disabled={index === 0}
                  onClick={() => void run(lobbyCommands.moveSong(song.id, index - 1))}
                >
                  ↑
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Nach unten"
                  disabled={index === lobby.queue.length - 1}
                  onClick={() => void run(lobbyCommands.moveSong(song.id, index + 1))}
                >
                  ↓
                </Button>
              </span>
            )}

            {mayRemove && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Entfernen"
                onClick={() => void run(lobbyCommands.removeSong(song.id))}
              >
                ✕
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
};
