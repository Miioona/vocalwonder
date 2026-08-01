"use client";

import { useEffect, useState } from "react";

import { useSettingsStore } from "@/stores/useSettingsStore";
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

  // Ein Gerätewechsel geht nur über einen neuen Stream, deshalb hängt der Start daran.
  const inputDeviceId = useSettingsStore((state) => state.inputDeviceId);

  useEffect(() => {
    if (!enabled) return;

    const context = engine.audioContext;
    if (!context) return;

    let cancelled = false;

    void (async () => {
      setStatus("starting");
      try {
        const { micSensitivity, monitorEnabled, monitorVolume } = useSettingsStore.getState();

        await microphone.start(context, {
          deviceId: inputDeviceId,
          sensitivity: micSensitivity,
          monitor: { enabled: monitorEnabled, volume: monitorVolume },
        });

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
        console.error("[mic]", err);
      }
    })();

    return () => {
      cancelled = true;
      microphone.stop();
    };
  }, [engine, enabled, microphone, inputDeviceId]);

  // Empfindlichkeit und Mithören lassen sich im laufenden Betrieb ändern — dafür braucht es
  // keinen neuen Stream, nur andere Schwellen bzw. eine andere Verstärkung.
  useEffect(
    () =>
      useSettingsStore.subscribe((state) => {
        microphone.setSensitivity(state.micSensitivity);
        microphone.setMonitor({ enabled: state.monitorEnabled, volume: state.monitorVolume });
      }),
    [microphone],
  );

  return { microphone, status, error };
};
