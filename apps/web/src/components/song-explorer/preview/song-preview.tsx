"use client";

import { Button } from "@/components/ui/button";
import { useExplorerStore } from "@/stores/useExplorerStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { SongDetails } from "./song-details";

/** Kopfbereich mit dem ausgewählten Song und den Aktionen dazu. */
export const SongPreview = () => {
  const file = useExplorerStore((state) => state.selectedFile);
  const startPlaying = usePlayerStore((state) => state.start);

  return (
    <section className="flex items-center gap-4 border-b border-neutral-800 px-4 py-3 md:px-6">
      {/* key: Beim Songwechsel neu aufsetzen, sonst blitzt kurz das alte Cover auf. */}
      <SongDetails key={file?.path} file={file} />
      <div className="flex md:flex-row flex-col md:space-x-2 md:space-y-0 space-x-0 space-y-1">
        <Button disabled className="shrink-0">
          Song Analysieren
        </Button>{" "}
        <Button disabled={!file} onClick={() => file && startPlaying(file)} className="shrink-0">
          ▶ Spielen
        </Button>
      </div>
    </section>
  );
};
