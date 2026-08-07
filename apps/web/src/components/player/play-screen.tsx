"use client";

import { useEffect, useState, type AnimationEvent } from "react";

import { FinishedScreen } from "@/components/player/finished-screen";
import { MicMeter } from "@/components/player/mic-meter";
import { PauseMenu } from "@/components/player/pause-menu";
import { PitchCanvas } from "@/components/player/pitch-canvas";
import { useChart } from "@/lib/player/use-chart";
import { useMicrophone } from "@/lib/player/use-microphone";
import { usePerformance } from "@/lib/player/use-performance";
import { useSaveScore } from "@/lib/scores/use-save-score";
import { nextSong } from "@/lib/song-explorer/playlist";
import { useExplorerStore } from "@/stores/useExplorerStore";
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
  const startPlaying = usePlayerStore((state) => state.start);
  const files = useExplorerStore((state) => state.files);
  const selectFile = useExplorerStore((state) => state.selectFile);
  const { metadata } = useSongMetadata(song);
  const { engine, phase, countdown, error, pause, resume, restart } = usePlayback(song);

  // Erst nach dem Dekodieren: Vorher gibt es keinen AudioContext, an den das Mikrofon kann.
  const chart = useChart(song);
  const { microphone, status: micStatus } = useMicrophone(
    engine,
    phase !== "loading" && phase !== "error",
  );

  // Aufnahme und Bewertung laufen nur, während wirklich gesungen wird.
  const { performance, snapshot } = usePerformance(engine, microphone, chart, phase === "playing");

  useSaveScore({
    song,
    chart,
    snapshot,
    durationMs: engine.durationMs,
    finished: phase === "finished",
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [positionMs, setPositionMs] = useState(0);

  // Läuft durchgehend, nicht nur beim Abspielen: Nach "Von vorn" muss die Anzeige auch
  // während des Countdowns auf 0 zurückspringen.
  useEffect(() => {
    const timer = window.setInterval(() => setPositionMs(engine.positionMs()), CLOCK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [engine]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Am Songende hat der Abschlussbildschirm eigene Knöpfe — kein Pausenmenü darüber.
      if (phase === "finished") return;
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
  }, [menuOpen, phase, pause, resume]);

  const requestExit = () => {
    engine.stop();
    setLeaving(true);
  };

  /** Vorschlag nach dem Song: der nächste aus derselben Liste, am Ende wieder von vorn. */
  const suggestion = nextSong(files, song.path);

  const playNext = (next: AudioFile) => {
    // Auswahl mitziehen, damit die Preview beim Zurückgehen den richtigen Song zeigt.
    selectFile(next);
    startPlaying(next);
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
      className={`fixed inset-0 z-50 overflow-hidden bg-background ${
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
        <div className="absolute inset-0 bg-linear-to-br from-muted to-background" />
      )}
      <div className="absolute inset-0 bg-background/50" />

      <div className="relative flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 p-4 md:p-6">
          <div className="min-w-0">
            <p className="truncate text-lg font-medium md:text-2xl">
              {metadata?.title ?? stripExtension(song.name)}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {metadata?.artist ?? "Unbekannter Artist"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {snapshot && (
              <div className="text-right">
                <p className="font-mono text-xl leading-none font-semibold tabular-nums md:text-3xl">
                  {snapshot.points.toLocaleString("de-DE")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {snapshot.hitNotes}/{snapshot.totalNotes} Noten
                </p>
              </div>
            )}

            <MicMeter microphone={microphone} status={micStatus} />

            <button
              type="button"
              onClick={() => {
                pause();
                setMenuOpen(true);
              }}
              className="rounded-md border border-border bg-background/40 px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              aria-label="Menü öffnen"
            >
              ☰
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {/* Zeitraster, gesungene Linie und Playhead — die Sollbalken kommen obendrauf. */}
          <PitchCanvas clock={engine} performance={performance} chart={chart} />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {phase === "loading" && <p className="text-muted-foreground">Song wird geladen …</p>}
            {phase === "countdown" && (
              <p key={countdown} className="animate-countdown text-7xl font-semibold md:text-9xl">
                {countdown}
              </p>
            )}
            {phase === "error" && <p className="text-destructive">{error}</p>}
          </div>
        </div>

        <footer className="p-4 md:p-6">
          <div className="h-1 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-foreground/70 transition-[width] duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
            <span>{formatDuration(positionMs)}</span>
            <span>{formatDuration(durationMs)}</span>
          </div>
        </footer>
      </div>

      {phase === "finished" && !menuOpen && (
        <FinishedScreen
          result={
            chart && snapshot && performance.current.scorer
              ? {
                  chart,
                  snapshot,
                  recording: performance.current.recording,
                  noteScores: performance.current.scorer.noteScores(),
                }
              : undefined
          }
          onRestart={restart}
          onExit={requestExit}
          next={suggestion}
          onPlayNext={playNext}
        />
      )}

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
