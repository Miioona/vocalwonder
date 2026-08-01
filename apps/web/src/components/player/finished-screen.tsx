"use client";

import { Button } from "@/components/ui/button";
import { stripExtension } from "@/lib/song-explorer/audio-files";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useSongMetadata } from "@/lib/song-explorer/use-song-metadata";

interface FinishedScreenProps {
  onRestart: () => void;
  onExit: () => void;
  /** Nächster Titel aus derselben Liste. Fehlt, wenn es nur einen Song gibt. */
  next?: AudioFile;
  onPlayNext: (song: AudioFile) => void;
}

/** Was nach dem letzten Ton passiert — nie eine Sackgasse. */
export const FinishedScreen = ({ onRestart, onExit, next, onPlayNext }: FinishedScreenProps) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-popover/95 p-5">
        <p className="text-center text-xl font-medium">Song zu Ende</p>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onRestart} className="w-full">
            Von vorn
          </Button>
          <Button variant="outline" onClick={onExit} className="w-full">
            Zurück zur Songübersicht
          </Button>
        </div>

        {next && <NextSong song={next} onPlay={() => onPlayNext(next)} />}
      </div>
    </div>
  );
};

const NextSong = ({ song, onPlay }: { song: AudioFile; onPlay: () => void }) => {
  const { metadata } = useSongMetadata(song);

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <p className="text-xs text-muted-foreground">Als Nächstes</p>

      <button
        type="button"
        onClick={onPlay}
        className="flex items-center gap-3 rounded-md p-2 text-left hover:bg-muted"
      >
        <span className="size-10 shrink-0 overflow-hidden rounded bg-accent">
          {metadata?.coverUrl && (
            // Kein next/image: Object-URLs kann der Optimizer nicht anfassen.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.coverUrl} alt="" className="size-full object-cover" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">
            {metadata?.title ?? stripExtension(song.name)}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {metadata?.artist ?? "Unbekannter Artist"}
          </span>
        </span>

        <span className="shrink-0 text-muted-foreground">▶</span>
      </button>
    </div>
  );
};
