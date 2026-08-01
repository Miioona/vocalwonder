"use client";

import { useEffect, useState } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface AudioDevices {
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  /**
   * Namen gibt es erst, wenn die Mikrofon-Berechtigung einmal erteilt wurde — vorher liefert
   * der Browser leere Beschriftungen. Daran erkennt die Oberfläche, dass sie statt einer
   * unbrauchbaren Liste einen Hinweis zeigen sollte.
   */
  labelsAvailable: boolean;
}

const EMPTY: AudioDevices = { inputs: [], outputs: [], labelsAvailable: false };

/** Liste der Audiogeräte, die sich beim An- und Abstecken selbst aktualisiert. */
export const useAudioDevices = (): AudioDevices => {
  const [devices, setDevices] = useState<AudioDevices>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const pick = (kind: MediaDeviceKind): AudioDevice[] =>
          all
            .filter((device) => device.kind === kind && device.deviceId !== "")
            .map((device) => ({
              deviceId: device.deviceId,
              label: device.label || "Unbenanntes Gerät",
            }));

        const inputs = pick("audioinput");
        setDevices({
          inputs,
          outputs: pick("audiooutput"),
          labelsAvailable: inputs.some((device) => device.label !== "Unbenanntes Gerät"),
        });
      } catch (err) {
        console.error("[devices]", err);
      }
    };

    void read();
    navigator.mediaDevices.addEventListener("devicechange", read);

    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", read);
    };
  }, []);

  return devices;
};

/** `setSinkId` gibt es nur in Chrome und Edge — sonst bleibt es bei der Systemausgabe. */
export const canChooseOutput = (): boolean =>
  typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;
