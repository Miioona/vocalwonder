"use client";

import { useEffect, useState } from "react";

import type { AudioFile } from "@/lib/song-explorer/types";
import { AudioEngine } from "./audio-engine";

export type PlaybackPhase = "loading" | "countdown" | "playing" | "paused" | "finished" | "error";

/** Der Countdown gibt dem AudioContext Zeit zum Aufwachen — und dem Sänger zum Einatmen. */
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 800;

/**
 * Führt einen Song durch seinen Lebenszyklus: laden, dekodieren, Countdown, abspielen.
 * Die Engine hängt an einem Ref und wird beim Verlassen freigegeben.
 */
export const usePlayback = (song: AudioFile) => {
  // Als State statt Ref: Die Engine wird einmal erzeugt und bleibt dieselbe Instanz, darf
  // aber im Render gelesen werden (ein Ref dürfte das nicht).
  const [engine] = useState(() => new AudioEngine());

  const [phase, setPhase] = useState<PlaybackPhase>("loading");
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const blob = await song.handle.getFile();
        await engine.load(blob);
        if (cancelled) return;
        setPhase("countdown");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Song konnte nicht geladen werden.");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
      engine.dispose();
    };
  }, [song, engine]);

  useEffect(() => engine.onEnded(() => setPhase("finished")), [engine]);

  useEffect(() => {
    if (phase !== "countdown") return;

    const timer = window.setTimeout(() => {
      if (countdown > 1) {
        setCountdown((value) => value - 1);
        return;
      }
      engine.start();
      setPhase("playing");
    }, COUNTDOWN_STEP_MS);

    return () => window.clearTimeout(timer);
  }, [phase, countdown, engine]);

  const pause = () => {
    if (!engine.isPlaying) return;
    engine.pause();
    setPhase("paused");
  };

  const resume = () => {
    if (phase !== "paused") return;
    engine.resume();
    setPhase("playing");
  };

  const restart = () => {
    engine.stop();
    setCountdown(COUNTDOWN_FROM);
    setPhase("countdown");
  };

  return { engine, phase, countdown, error, pause, resume, restart };
};
