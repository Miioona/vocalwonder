"use client";

import { Button } from "@/components/ui/button";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { SongDetails } from "./song-details";

/** Kopfbereich mit dem ausgewählten Song und den Aktionen dazu. */
export const SongPreview = () => {
  const file = useExplorerStore((state) => state.selectedFile);
  const startPlaying = usePlayerStore((state) => state.start);
  const analyse = useAnalysisStore((state) => state.analyse);
  const runningPath = useAnalysisStore((state) => state.runningPath);
  const progress = useAnalysisStore((state) => state.progress);

  const running = Boolean(file) && runningPath === file?.path;
  const percent = progress?.ratio === undefined ? undefined : Math.round(progress.ratio * 100);

  return (
    <section className="flex items-center gap-4 border-b border-neutral-800 px-4 py-3 md:px-6">
      {/* key: Beim Songwechsel neu aufsetzen, sonst blitzt kurz das alte Cover auf. */}
      <SongDetails key={file?.path} file={file} />
      <div className="flex flex-col space-y-1 space-x-0 md:flex-row md:space-y-0 md:space-x-2">
        <Button
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
        <Button disabled={!file} onClick={() => file && startPlaying(file)} className="shrink-0">
          ▶ Spielen
        </Button>
      </div>
    </section>
  );
};
