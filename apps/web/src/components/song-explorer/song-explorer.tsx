"use client";

import { useEffect } from "react";
import { EmptyExplorer } from "@/components/song-explorer/explorer/empty-explorer";
import { Explorer } from "@/components/song-explorer/explorer/explorer";
import { SongPreview } from "@/components/song-explorer/preview/song-preview";
import { PlayScreen } from "@/components/player/play-screen";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { ExplorerHeader } from "./header/explorer-header";

/**
 * Das Grundgerüst der App: Kopfzeile, Preview, Explorer. Hält selbst keinen Zustand —
 * die Kinder holen sich, was sie brauchen, aus dem Store.
 */
export const SongExplorer = () => {
  const status = useExplorerStore((state) => state.status);
  const restore = useExplorerStore((state) => state.restore);
  const mode = usePlayerStore((state) => state.mode);
  const song = usePlayerStore((state) => state.song);

  // Erst nach dem Mount möglich: Auf dem Server gibt es weder window noch IndexedDB.
  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    <>
      {/* Blendet aus, während der Spielbildschirm einblendet — die beiden kreuzen sich. */}
      <main
        className={cn(
          "flex h-dvh flex-col overflow-hidden transition-opacity duration-200",
          mode === "play" && "opacity-0",
        )}
      >
        <ExplorerHeader />
        <SongPreview />
        <div className="min-h-0 flex-1">
          {status === "ready" ? <Explorer /> : <EmptyExplorer />}
        </div>
      </main>

      {mode === "play" && song && <PlayScreen song={song} />}
    </>
  );
};
