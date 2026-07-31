"use client";

import { midiToNoteName } from "@vocalwonder/core";
import { useEffect, useState } from "react";

import type { Microphone } from "@/lib/player/microphone";
import type { MicrophoneStatus } from "@/lib/player/use-microphone";

/** Zehnmal pro Sekunde reicht fürs Auge — die Linie im Canvas läuft mit voller Bildrate. */
const REFRESH_MS = 100;

interface MicMeterProps {
  microphone: Microphone;
  status: MicrophoneStatus;
}

/** Kleine Kontrollanzeige: Kommt überhaupt Signal an, und welcher Ton wird erkannt? */
export const MicMeter = ({ microphone, status }: MicMeterProps) => {
  const [level, setLevel] = useState(0);
  const [note, setNote] = useState<string>();

  useEffect(() => {
    if (status !== "running") return;

    const timer = window.setInterval(() => {
      const sample = microphone.read();
      setLevel(sample.level);
      setNote(sample.midi === undefined ? undefined : midiToNoteName(Math.round(sample.midi)));
    }, REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [microphone, status]);

  if (status === "denied") {
    return <span className="text-xs text-amber-400">Mikrofon nicht erlaubt</span>;
  }

  if (status === "error") {
    return <span className="text-xs text-red-400">Mikrofon nicht verfügbar</span>;
  }

  if (status !== "running") {
    return <span className="text-xs text-neutral-500">Mikrofon startet …</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-[width] duration-100"
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
      <span className="w-8 font-mono text-xs text-emerald-400">{note ?? "–"}</span>
    </div>
  );
};
