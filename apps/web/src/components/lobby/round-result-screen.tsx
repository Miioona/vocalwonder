"use client";

import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import type { LobbyScore, LobbyState, RoundResult } from "@vocalwonder/core";
import { toast } from "sonner";

import { GameCard } from "@/components/common/game-card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/auth-client";
import { QUERY_KEYS } from "@/lib/query-keys";
import { lobbyCommands } from "@/lib/realtime/socket";
import { saveScore } from "@/lib/scores/save-score";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { cn } from "@/lib/utils";

/**
 * Was nach einem Song steht: Plätze, Gesamtwertung, der nächste Song.
 *
 * Von hier gehen zwei Wege — gleich wieder bereit oder zurück in die Lobby. Beide führen zum
 * selben Start; in der Lobby lässt sich ebenfalls bereit drücken.
 */
export const RoundResultScreen = ({
  lobby,
  result,
  meId,
}: {
  lobby: LobbyState;
  result: RoundResult;
  meId: string;
}) => {
  const clearResult = useLobbyStore((state) => state.clearResult);
  const [ready, setReady] = useState(false);

  useSaveRoundScore(result);

  const toggleReady = async () => {
    const next = !ready;
    const answer = await lobbyCommands.ready(next);

    if (!answer.ok) {
      toast(answer.message ?? "Ging nicht");
      return;
    }

    setReady(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-lg font-semibold">{result.song.title}</h1>
          <p className="text-sm text-muted-foreground">{result.song.artist}</p>
        </div>

        <GameCard framed title="Dieser Song">
          <Ranking scores={result.scores} lobby={lobby} meId={meId} showRatio />
        </GameCard>

        {result.totals.length > 0 && (
          <GameCard framed title="Gesamt">
            <Ranking scores={result.totals} lobby={lobby} meId={meId} />
          </GameCard>
        )}

        {result.next ? (
          <GameCard framed title="Als Nächstes">
            <p className="truncate text-sm">{result.next.title}</p>
            <p className="truncate text-xs text-muted-foreground">{result.next.artist}</p>
          </GameCard>
        ) : (
          <p className="text-sm text-muted-foreground">Keine weiteren Songs.</p>
        )}

        <div className="flex gap-2">
          {result.next && (
            <Button variant={ready ? "outline" : "default"} onClick={() => void toggleReady()}>
              {ready ? "Doch nicht bereit" : "Bereit"}
            </Button>
          )}

          <Button variant="outline" onClick={clearResult}>
            Zur Lobby
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Das eigene Ergebnis sichern — einmal je Runde.
 *
 * Jeder speichert seins selbst; gerechnet wurde ohnehin bei jedem. Ohne Konto passiert nichts,
 * das Spiel funktioniert auch so.
 */
function useSaveRoundScore(result: RoundResult) {
  const { data: session } = useSession();
  const snapshot = useLobbyStore((state) => state.mySnapshot);
  const queryClient = useQueryClient();
  const saved = useRef<string>(undefined);

  useEffect(() => {
    if (!session || !snapshot || saved.current === result.roundId) return;
    saved.current = result.roundId;

    void saveScore({
      songHash: result.song.songHash,
      title: result.song.title,
      artist: result.song.artist,
      points: snapshot.points,
      ratio: snapshot.ratio,
      hitNotes: snapshot.hitNotes,
      totalNotes: snapshot.totalNotes,
      durationMs: result.song.durationMs,
      analysisVersion: result.song.analysisVersion,
      gameType: "duel",
      roundId: result.roundId,
    })
      .then(() => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_SCORES] }))
      .catch((error: unknown) => console.error("[scores]", error));
  }, [queryClient, result, session, snapshot]);
}

const Ranking = ({
  scores,
  lobby,
  meId,
  showRatio = false,
}: {
  scores: LobbyScore[];
  lobby: LobbyState;
  meId: string;
  showRatio?: boolean;
}) => (
  <ol className="flex flex-col">
    {scores.map((score, index) => {
      const player = lobby.players.find((item) => item.userId === score.userId);

      return (
        <li
          key={score.userId}
          className={cn(
            "flex items-center gap-3 border-b border-border py-2 last:border-0",
            score.userId === meId && "font-medium",
          )}
        >
          <span className="w-5 text-center text-sm text-muted-foreground tabular-nums">
            {index + 1}
          </span>

          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: player?.color ?? "transparent" }}
          />

          <span className="min-w-0 flex-1 truncate text-sm">{player?.playerName ?? "…"}</span>

          {showRatio && (
            <span className="text-xs text-muted-foreground">{Math.round(score.ratio * 100)} %</span>
          )}

          <span className="font-mono text-sm tabular-nums">
            {score.points.toLocaleString("de-DE")}
          </span>
        </li>
      );
    })}
  </ol>
);
