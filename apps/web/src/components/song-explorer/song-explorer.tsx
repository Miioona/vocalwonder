"use client";

import { EmptyExplorer } from "@/components/song-explorer/explorer/empty-explorer";
import { Explorer } from "@/components/song-explorer/explorer/explorer";
import { SongPreview } from "@/components/song-explorer/preview/song-preview";
import { PlayScreen } from "@/components/player/play-screen";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { usePlayerStore } from "@/stores/usePlayerStore";

/**
 * Die Bibliothek: Preview oben, darunter Ordner und Songs. Hält selbst keinen Zustand —
 * die Kinder holen sich, was sie brauchen, aus dem Store.
 *
 * Die Kopfzeile liegt im Layout, der Ordner wird beim Start der App zurückgeholt
 * (`LibraryBoot`) — beides brauchen Startseite und Bibliothek gleichermaßen.
 */
export const SongExplorer = () => {
  const status = useExplorerStore((state) => state.status);
  const mode = usePlayerStore((state) => state.mode);
  const song = usePlayerStore((state) => state.song);

  return (
    <>
      {/* Blendet aus, während der Spielbildschirm einblendet — die beiden kreuzen sich. */}
      <main
        className={cn(
          "flex h-full flex-col overflow-hidden transition-opacity duration-200",
          mode === "play" && "opacity-0",
        )}
      >
        <SongPreview />
        <div className="min-h-0 flex-1">
          {status === "ready" ? <Explorer /> : <EmptyExplorer />}
        </div>
      </main>

      {/* key: Beim Songwechsel neu aufsetzen — so bekommt jeder Song eine frische Engine
          und ein frisches Mikrofon, statt den Zustand des vorherigen zu erben. */}
      {mode === "play" && song && <PlayScreen key={song.path} song={song} />}
    </>
  );
};
