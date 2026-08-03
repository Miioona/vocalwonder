"use client";

import { DEMO_SONGS, type DemoSong } from "@/lib/song-explorer/demo-songs";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { cn } from "@/lib/utils";

/**
 * Die mitgelieferten Songs zum Ausprobieren.
 *
 * Ein Klick wählt den Song aus wie in der Bibliothek — Vorschau und Spielen funktionieren
 * danach unverändert, weil beide nur auf `selectedFile` schauen. `setFiles` sorgt dafür, dass
 * "nächster Titel" nach dem Spielen auch hier greift.
 */
export const DemoSongs = () => {
  const selectedFile = useExplorerStore((state) => state.selectedFile);
  const selectFile = useExplorerStore((state) => state.selectFile);
  const setFiles = useExplorerStore((state) => state.setFiles);

  const choose = (song: DemoSong) => {
    setFiles(DEMO_SONGS);
    selectFile(song);
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-1 text-left">
      {DEMO_SONGS.map((song) => (
        <button
          key={song.path}
          type="button"
          onClick={() => choose(song)}
          className={cn(
            "flex flex-col gap-0.5 rounded-md border border-border px-3 py-2 transition-colors",
            selectedFile?.path === song.path ? "border-primary/50 bg-primary/10" : "hover:bg-muted",
          )}
        >
          <span className="text-sm text-foreground">{song.credit.title}</span>
          <span className="text-xs text-muted-foreground">{song.credit.artist}</span>
        </button>
      ))}

      <p className="mt-1 text-xs text-muted-foreground">
        Diese beiden Songs sind bereits analysiert und können sofort gestartet werden. Eigene Songs
        können neu analysiert werden. Eine Berechnung dauert etwa so lange wieder die Länge des
        Songs.
      </p>

      {/* CC BY verlangt die Nennung dort, wo die Musik benutzt wird. */}
      <p className="mt-1 text-xs text-muted-foreground">
        {DEMO_SONGS.map((song, index) => (
          <span key={song.path}>
            {index > 0 && " · "}
            <a
              href={song.credit.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {song.credit.artist}
            </a>{" "}
            <a
              href={song.credit.licenseUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {song.credit.license}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
};
