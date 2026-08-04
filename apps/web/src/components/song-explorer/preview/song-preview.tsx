"use client";

import { Button } from "@/components/ui/button";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { SongDetails } from "./song-details";

/** Kopfbereich mit dem ausgewählten Song und den Aktionen dazu. */
export const SongPreview = () => {
  const file = useExplorerStore((state) => state.selectedFile);
  const startPlaying = usePlayerStore((state) => state.start);
  const analyse = useAnalysisStore((state) => state.analyse);
  const runningPath = useAnalysisStore((state) => state.runningPath);
  const progress = useAnalysisStore((state) => state.progress);

  const inLobby = useLobbyStore((state) => state.lobby !== null);

  const running = Boolean(file) && runningPath === file?.path;
  const percent = progress?.ratio === undefined ? undefined : Math.round(progress.ratio * 100);

  return (
    <section className="flex items-center gap-4 border-b border-border px-4 py-3 md:px-6">
      {/* key: Beim Songwechsel neu aufsetzen, sonst blitzt kurz das alte Cover auf. */}
      <SongDetails key={file?.path} file={file} />
      <div className="flex flex-col space-y-1 space-x-0 md:flex-row md:space-y-0 md:space-x-2">
        <Button
          variant="outline"
          disabled={!file || Boolean(runningPath)}
          onClick={() => file && void analyse(file)}
          className="shrink-0 disabled:opacity-100"
          // Der Fortschritt läuft als Füllung durch den Knopf — die kleine Anzeige links
          // sieht man kaum, und ohne Rückmeldung wirkt der Knopf kaputt.
          style={
            running && percent !== undefined
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(52,211,153,0.22) ${percent}%, transparent ${percent}%)`,
                }
              : undefined
          }
        >
          {running
            ? percent === undefined
              ? "analysiert …"
              : `analysiert … ${percent} %`
            : "Song analysieren"}
        </Button>{" "}
        {/* In einer Lobby wird nicht allein gesungen — dort wird der Song gemeinsam gewählt. */}
        <Button
          disabled={!file || inLobby}
          title={inLobby ? "Du bist in einer Lobby" : undefined}
          onClick={() => file && startPlaying(file)}
          className="shrink-0"
        >
          ▶ Spielen
        </Button>
      </div>
    </section>
  );
};
