"use client";

import { PlayScreen } from "@/components/player/play-screen";
import { SeparationSpike } from "@/components/development/separation-spike";
import { usePlayerStore } from "@/stores/usePlayerStore";

/** Nicht verlinkte Werkbank für Messversuche. Fliegt raus, wenn die Fragen beantwortet sind. */
export default function DevelopmentPage() {
  const mode = usePlayerStore((state) => state.mode);
  const song = usePlayerStore((state) => state.song);

  // Der Body ist global auf Fensterhöhe ohne Scroll festgenagelt (die App soll sich wie eine
  // Desktop-Anwendung anfühlen). Diese Seite ist eine Ausnahme und scrollt in sich selbst.
  return (
    <div className="h-dvh overflow-y-auto">
      <SeparationSpike />

      {/* Derselbe Spielbildschirm wie in der App — hier nur mit dem Chart aus der Werkbank. */}
      {mode === "play" && song && <PlayScreen key={song.path} song={song} />}
    </div>
  );
}
