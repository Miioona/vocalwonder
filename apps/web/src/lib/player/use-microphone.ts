"use client";

import { useEffect, useState } from "react";

import type { AudioEngine } from "./audio-engine";
import { Microphone } from "./microphone";

export type MicrophoneStatus = "idle" | "starting" | "running" | "denied" | "error";

/**
 * Startet das Mikrofon, sobald der AudioContext existiert (also nach dem Dekodieren des
 * Songs), und gibt es beim Verlassen wieder frei — sonst bleibt die Aufnahmeanzeige im
 * Browser-Tab stehen.
 */
export const useMicrophone = (engine: AudioEngine, enabled: boolean) => {
  const [microphone] = useState(() => new Microphone());
  const [status, setStatus] = useState<MicrophoneStatus>("idle");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!enabled) return;

    const context = engine.audioContext;
    if (!context) return;

    let cancelled = false;

    void (async () => {
      setStatus("starting");
      try {
        await microphone.start(context);
        if (cancelled) {
          microphone.stop();
          return;
        }
        setStatus("running");
      } catch (err) {
        if (cancelled) return;

        const denied =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "SecurityError");

        setStatus(denied ? "denied" : "error");
        setError(err instanceof Error ? err.message : "Mikrofon nicht verfügbar.");
      }
    })();

    return () => {
      cancelled = true;
      microphone.stop();
    };
  }, [engine, enabled, microphone]);

  return { microphone, status, error };
};
