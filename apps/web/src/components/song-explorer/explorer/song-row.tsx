"use client";

import { formatDuration, stripExtension } from "@/lib/song-explorer/audio-files";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useInView } from "@/lib/song-explorer/use-in-view";
import { useSongMetadata } from "@/lib/song-explorer/use-song-metadata";
import { cn } from "@/lib/utils";

interface SongRowProps {
  file: AudioFile;
  selected: boolean;
  onSelect: (file: AudioFile) => void;
}

/**
 * Eine Songzeile. Die Tags werden erst gelesen, wenn die Zeile in Sichtweite kommt —
 * bei 120 Dateien wäre das Lesen beim Öffnen des Ordners sonst deutlich spürbar.
 */
export const SongRow = ({ file, selected, onSelect }: SongRowProps) => {
  const { ref, inView } = useInView<HTMLLIElement>();
  const { metadata } = useSongMetadata(file, { enabled: inView });

  return (
    <li ref={ref}>
      <button
        type="button"
        onClick={() => onSelect(file)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md p-2 text-left",
          selected ? "bg-neutral-800" : "hover:bg-neutral-900",
        )}
      >
        <span className="size-10 shrink-0 overflow-hidden rounded bg-neutral-800">
          {metadata?.coverUrl ? (
            // Kein next/image: Object-URLs kann der Optimizer nicht anfassen.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={metadata.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-neutral-600">
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                <path d="M13 2.5v7.7a2.3 2.3 0 1 1-1.2-2V5L7 6v6.2a2.3 2.3 0 1 1-1.2-2V4.2L13 2.5z" />
              </svg>
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-neutral-200">
            {metadata?.title ?? stripExtension(file.name)}
          </span>
          <span className="block truncate text-xs text-neutral-600">
            {metadata?.artist ?? "Unbekannter Artist"}
            {metadata?.album ? ` · ${metadata.album}` : ""}
          </span>
        </span>

        <span className="shrink-0 font-mono text-xs text-neutral-600">
          {formatDuration(metadata?.durationMs)}
        </span>
      </button>
    </li>
  );
};
