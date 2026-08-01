"use client";

import { useMyScores } from "@/lib/scores/use-my-scores";

/** Die zuletzt gesungenen Songs mit Punktzahl — neueste zuerst. */
export const ScoreHistory = () => {
  const { data: scores, isPending, isError } = useMyScores();

  if (isPending) return <p className="text-sm text-muted-foreground">lädt …</p>;
  if (isError) return <p className="text-sm text-destructive">Verlauf nicht abrufbar</p>;

  if (!scores || scores.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch nichts gesungen.</p>;
  }

  return (
    <ul className="flex flex-col">
      {scores.map((score) => (
        <li
          key={score.id}
          className="flex items-center gap-3 border-b border-border py-2 last:border-0"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{score.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {formatDate(score.playedAt)}
              {score.artist ? ` · ${score.artist}` : ""}
            </span>
          </span>

          <span className="shrink-0 text-right">
            <span className="block font-mono text-sm tabular-nums">
              {score.points.toLocaleString("de-DE")}
            </span>
            <span className="block text-xs text-muted-foreground">
              {Math.round(score.ratio * 100)} %
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
