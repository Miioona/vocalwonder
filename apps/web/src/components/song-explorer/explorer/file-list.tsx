"use client";

import { SongRow } from "@/components/song-explorer/explorer/song-row";
import { formatSkipped } from "@/lib/song-explorer/audio-files";
import type { AudioFile, SkippedKind, SubFolder } from "@/lib/song-explorer/types";

interface FileListProps {
  /** Unterordner stehen über den Songs — wie im Dateimanager kommt man auch von hier tiefer. */
  folders: SubFolder[];
  files: AudioFile[];
  /** Endungen, die der Filter aussortiert hat — erklärt einen scheinbar leeren Ordner. */
  skipped: SkippedKind[];
  status: "idle" | "loading" | "done" | "error";
  error?: string;
  selectedPath?: string;
  onSelect: (file: AudioFile) => void;
  onEnterFolder: (folder: SubFolder) => void;
}

export const FileList = ({
  folders,
  files,
  skipped,
  status,
  error,
  selectedPath,
  onSelect,
  onEnterFolder,
}: FileListProps) => {
  if (status === "loading" && files.length === 0 && folders.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">lädt …</p>;
  }

  if (status === "error") {
    return <p className="p-4 text-sm text-destructive">{error}</p>;
  }

  if (status === "done" && files.length === 0 && folders.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p>Dieser Ordner enthält keine unterstützten Songs.</p>
        {skipped.length > 0 && (
          <p className="mt-2 text-xs">Übersprungen: {skipped.map(formatSkipped).join(", ")}</p>
        )}
      </div>
    );
  }

  return (
    <ul className="p-2">
      {folders.map((folder) => (
        <li key={folder.path}>
          <button
            type="button"
            onClick={() => onEnterFolder(folder)}
            className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
              <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden>
                <path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5v7A1.5 1.5 0 0 1 13 13.5H3A1.5 1.5 0 0 1 1.5 12V3.5z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{folder.name}</span>
            <span className="shrink-0 text-muted-foreground">›</span>
          </button>
        </li>
      ))}

      {files.map((file) => (
        <SongRow
          key={file.path}
          file={file}
          selected={selectedPath === file.path}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
};
