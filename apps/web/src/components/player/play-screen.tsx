"use client";

import { useEffect, useState, type AnimationEvent } from "react";

import { PauseMenu } from "@/components/player/pause-menu";
import { usePlayback } from "@/lib/player/use-playback";
import { formatDuration, stripExtension } from "@/lib/song-explorer/audio-files";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useSongMetadata } from "@/lib/song-explorer/use-song-metadata";
import { usePlayerStore } from "@/stores/usePlayerStore";

/** Die Zeitanzeige braucht keine 60 Hz — der Canvas später schon, der liest direkt am Engine. */
const CLOCK_INTERVAL_MS = 250;

/**
 * Der Spielmodus: Vollbild über der Bibliothek, unscharfes Cover als Hintergrund,
 * darüber (später) das Canvas mit den Balken.
 */
export const PlayScreen = ({ song }: { song: AudioFile }) => {
  const exit = usePlayerStore((state) => state.exit);
  const { metadata } = useSongMetadata(song);
  const { engine, phase, countdown, error, pause, resume, restart } = usePlayback(song);

  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  useEffect(() => {
    if (phase !== "playing") return;

    const timer = window.setInterval(() => setPositionMs(engine.positionMs()), CLOCK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [phase, engine]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();

      // Esc ist ein Umschalter: Öffnen pausiert, Schließen setzt fort. Sonst bliebe der
      // Song nach dem Zumachen stumm stehen.
      if (menuOpen) {
        setMenuOpen(false);
        resume();
      } else {
        pause();
        setMenuOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, pause, resume]);

  const requestExit = () => {
    engine.stop();
    setLeaving(true);
  };

  const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    // Kindanimationen (Countdown) sollen den Ausstieg nicht auslösen.
    if (event.target !== event.currentTarget) return;
    if (leaving) exit();
  };

  const durationMs = engine.durationMs;
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-neutral-950 ${
        leaving ? "animate-screen-out" : "animate-screen-in"
      }`}
      onAnimationEnd={onAnimationEnd}
    >
      {metadata?.coverUrl ? (
        // Unscharf per CSS statt im Canvas: kostet keine Rechenzeit pro Frame.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={metadata.coverUrl}
          alt=""
          className="absolute inset-0 size-full scale-110 object-cover blur-md brightness-70 saturate-150"
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-neutral-900 to-neutral-950" />
      )}
      <div className="absolute inset-0 bg-neutral-950/50" />

      <div className="relative flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 p-4 md:p-6">
          <div className="min-w-0">
            <p className="truncate text-lg font-medium md:text-2xl">
              {metadata?.title ?? stripExtension(song.name)}
            </p>
            <p className="truncate text-sm text-neutral-400">
              {metadata?.artist ?? "Unbekannter Artist"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              pause();
              setMenuOpen(true);
            }}
            className="shrink-0 rounded-md border border-neutral-700/60 bg-neutral-950/40 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
            aria-label="Menü öffnen"
          >
            ☰
          </button>
        </header>

        {/* Hier kommt das Canvas mit den Balken hin. */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {phase === "loading" && <p className="text-neutral-400">Song wird geladen …</p>}
          {phase === "countdown" && (
            <p key={countdown} className="animate-countdown text-7xl font-semibold md:text-9xl">
              {countdown}
            </p>
          )}
          {phase === "finished" && <p className="text-2xl text-neutral-300">Fertig.</p>}
          {phase === "error" && <p className="text-red-400">{error}</p>}
        </div>

        <footer className="p-4 md:p-6">
          <div className="h-1 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-neutral-300 transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-neutral-500">
            <span>{formatDuration(positionMs)}</span>
            <span>{formatDuration(durationMs)}</span>
          </div>
        </footer>
      </div>

      {menuOpen && (
        <PauseMenu
          canResume={phase === "paused"}
          onResume={() => {
            setMenuOpen(false);
            resume();
          }}
          onRestart={() => {
            setMenuOpen(false);
            restart();
          }}
          onExit={requestExit}
        />
      )}
    </div>
  );
};
