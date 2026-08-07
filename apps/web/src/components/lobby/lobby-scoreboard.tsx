"use client";

import type { LobbyState } from "@vocalwonder/core";

import { useLobbyStore } from "@/stores/useLobbyStore";
import { cn } from "@/lib/utils";

/**
 * Die Rangfolge im laufenden Song.
 *
 * Links am Rand: Dort läuft nichts, was man treffen müsste — die Balken kommen von rechts und
 * enden am Zeiger. Wer noch keine Punkte gemeldet hat, steht mit null da, nicht gar nicht;
 * sonst hüpft die Liste bei jedem ersten Ton.
 */
export const LobbyScoreboard = ({ lobby, meId }: { lobby: LobbyState; meId: string }) => {
  const scores = useLobbyStore((state) => state.scores);

  const ranked = lobby.players
    .map((player) => ({
      player,
      points: scores.find((score) => score.userId === player.userId)?.points ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <ol className="pointer-events-none absolute top-3 left-3 z-10 flex w-40 flex-col gap-1">
      {ranked.map(({ player, points }, index) => (
        <li
          key={player.userId}
          className={cn(
            "flex items-center gap-2 rounded-md bg-background/70 px-2 py-1 backdrop-blur-sm",
            player.userId === meId && "ring-1",
          )}
          style={player.userId === meId ? { color: player.color } : undefined}
        >
          <span className="w-4 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
          <span className="size-2 shrink-0 rounded-full" style={{ background: player.color }} />

          <span className="min-w-0 flex-1 truncate text-xs text-foreground">
            {player.playerName}
          </span>

          <span className="font-mono text-xs tabular-nums">{points.toLocaleString("de-DE")}</span>
        </li>
      ))}
    </ol>
  );
};
