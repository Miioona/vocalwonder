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
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-950/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-950/90 p-5">
        <p className="text-center text-xl font-medium">Song zu Ende</p>

        <div className="flex flex-col gap-2">
          <Button onClick={onRestart} className="w-full">
            Von vorn
          </Button>
          <Button onClick={onExit} className="w-full">
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
    <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4">
      <p className="text-xs text-neutral-500">Als Nächstes</p>

      <button
        type="button"
        onClick={onPlay}
        className="flex items-center gap-3 rounded-md p-2 text-left hover:bg-neutral-900"
      >
        <span className="size-10 shrink-0 overflow-hidden rounded bg-neutral-800">
          {metadata?.coverUrl && (
            // Kein next/image: Object-URLs kann der Optimizer nicht anfassen.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.coverUrl} alt="" className="size-full object-cover" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-neutral-200">
            {metadata?.title ?? stripExtension(song.name)}
          </span>
          <span className="block truncate text-xs text-neutral-600">
            {metadata?.artist ?? "Unbekannter Artist"}
          </span>
        </span>

        <span className="shrink-0 text-neutral-500">▶</span>
      </button>
    </div>
  );
};
