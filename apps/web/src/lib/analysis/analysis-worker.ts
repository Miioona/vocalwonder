/// <reference lib="webworker" />

import { buildChart } from "./build-notes";
import { trackPitch } from "./pitch-track";
import { loadModel, separateVocals, MODELS } from "./separation";
import { ANALYSIS_VERSION, type AnalysisProgress, type AnalysisResult } from "./types";

/**
 * Der Arbeiter, der die Analyse trägt.
 *
 * Trennung und Notenbau laufen hier, damit die Oberfläche währenddessen bedienbar bleibt —
 * ein Song braucht ungefähr seine eigene Spieldauer.
 *
 * Das Dekodieren passiert **nicht** hier: `decodeAudioData` gibt es nur im Fenster, nicht im
 * Worker. Der Aufrufer schickt die fertigen Kanäle herüber.
 */

export interface AnalysisRequest {
  channels: Float32Array[];
  durationMs: number;
  title: string;
  artist: string;
}

export type AnalysisMessage =
  | { type: "progress"; progress: AnalysisProgress }
  | { type: "done"; result: AnalysisResult }
  | { type: "error"; message: string };

const post = (message: AnalysisMessage) => self.postMessage(message);

self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const { channels, durationMs, title, artist } = event.data;

  void (async () => {
    try {
      const model = await loadModel("webgpu", (progress) => post({ type: "progress", progress }));

      const separation = await separateVocals(
        model,
        channels,
        (progress) => post({ type: "progress", progress }),
        true,
      );

      post({
        type: "progress",
        progress: { stage: "notes", message: "Noten werden gebaut …" },
      });

      const pitch = trackPitch(separation.vocals);
      const chart = buildChart(pitch, { title, artist });

      const result: AnalysisResult = {
        chart,
        pitch,
        meta: {
          model: MODELS.webgpu.url,
          version: ANALYSIS_VERSION,
          createdAt: new Date().toISOString(),
          durationMs,
          separationMs: separation.totalMs,
        },
      };

      post({ type: "done", result });
    } catch (err) {
      post({
        type: "error",
        message: err instanceof Error ? err.message : "Analyse fehlgeschlagen.",
      });
    }
  })();
};
