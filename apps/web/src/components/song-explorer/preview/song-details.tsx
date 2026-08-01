"use client";

import { useEffect } from "react";

import { formatDuration, stripExtension } from "@/lib/song-explorer/audio-files";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useSongMetadata } from "@/lib/song-explorer/use-song-metadata";
import { cn } from "@/lib/utils";
import { useAnalysisStore } from "@/stores/useAnalysisStore";

interface SongDetailsProps {
  file?: AudioFile;
}

/**
 * Cover, Titel und Untertitel des ausgewählten Songs, aus den Tags der Datei gelesen.
 * Fehlt ein Tag, tritt der Dateiname bzw. ein Platzhalter an seine Stelle — viele
 * Sammlungen sind lückenhaft getaggt, und leere Felder sähen aus wie ein Fehler.
 */
export const SongDetails = ({ file }: SongDetailsProps) => {
  // `precise`: Für den einen ausgewählten Song lohnt sich das genaue Ermitteln der Länge.
  const { metadata, status } = useSongMetadata(file, { precise: true });

  const title = metadata?.title ?? (file ? stripExtension(file.name) : "Kein Song ausgewählt");
  const artist = metadata?.artist ?? "Unbekannter Artist";
  const subtitle = file
    ? `${artist} · ${formatDuration(metadata?.durationMs)}`
    : "Wähle einen Ordner und darin einen Song.";

  return (
    <>
      <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted md:size-20">
        {metadata?.coverUrl ? (
          // Kein next/image: Object-URLs kann der Optimizer nicht anfassen.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={metadata.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <svg viewBox="0 0 16 16" className="size-6 md:size-8" fill="currentColor" aria-hidden>
              <path d="M13 2.5v7.7a2.3 2.3 0 1 1-1.2-2V5L7 6v6.2a2.3 2.3 0 1 1-1.2-2V4.2L13 2.5z" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground md:text-lg" title={file?.path}>
          {title}
        </p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        {file && <AnalysisBadge file={file} tagsLoading={status === "loading"} />}
      </div>
    </>
  );
};

/** Zeigt, ob für diesen Song schon Balken vorliegen — und wie weit die Analyse ist. */
const AnalysisBadge = ({ file, tagsLoading }: { file: AudioFile; tagsLoading: boolean }) => {
  const load = useAnalysisStore((state) => state.load);
  const result = useAnalysisStore((state) => state.results[file.path]);
  const runningPath = useAnalysisStore((state) => state.runningPath);
  const progress = useAnalysisStore((state) => state.progress);

  useEffect(() => {
    void load(file);
  }, [file, load]);

  const running = runningPath === file.path;
  const label = running
    ? `analysiert … ${progress?.ratio === undefined ? "" : `${Math.round(progress.ratio * 100)} %`}`.trim()
    : result
      ? `Chart vorhanden · ${result.chart.phrases.length} Phrasen`
      : tagsLoading
        ? "lese Tags …"
        : "noch nicht analysiert";

  return (
    <span
      className={cn(
        "mt-1.5 inline-block rounded-full border px-2 py-0.5 text-xs",
        result ? "border-voice/40 text-voice" : "border-border text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
};
