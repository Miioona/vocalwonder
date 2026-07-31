import { stripExtension } from "@/lib/song-explorer/audio-files";
import type { AudioFile } from "@/lib/song-explorer/types";
import type { AnalysisMessage, AnalysisRequest } from "./analysis-worker";
import { decodeBytesForModel } from "./audio-io";
import { readAnalysis, readFileWithKey, writeAnalysis } from "./cache";
import type { AnalysisProgress, AnalysisResult } from "./types";

export interface AnalysisRun {
  result: Promise<AnalysisResult>;
  /** Bricht ab und räumt den Worker weg. */
  cancel: () => void;
}

/**
 * Analysiert einen Song: aus dem Cache holen, sonst dekodieren und im Worker rechnen.
 *
 * Das Dekodieren bleibt im Fenster — `decodeAudioData` gibt es im Worker nicht. Die fertigen
 * Kanäle werden übergeben statt kopiert (Transfer), sonst lägen mehrere hundert Megabyte
 * doppelt im Speicher.
 */
export function runAnalysis(
  file: AudioFile,
  onProgress: (progress: AnalysisProgress) => void,
): AnalysisRun {
  let worker: Worker | undefined;
  let cancelled = false;

  const result = (async (): Promise<AnalysisResult> => {
    const { bytes, key } = await readFileWithKey(file);

    const cached = await readAnalysis(key);
    if (cached) return cached;

    onProgress({ stage: "decode", message: "Song wird dekodiert …" });
    const audio = await decodeBytesForModel(bytes);
    if (cancelled) throw new Error("Abgebrochen.");

    worker = new Worker(new URL("./analysis-worker.ts", import.meta.url), { type: "module" });

    const analysis = await new Promise<AnalysisResult>((resolve, reject) => {
      if (!worker) return;

      worker.onmessage = (event: MessageEvent<AnalysisMessage>) => {
        const message = event.data;
        if (message.type === "progress") onProgress(message.progress);
        else if (message.type === "done") resolve(message.result);
        else reject(new Error(message.message));
      };

      worker.onerror = (event) => reject(new Error(event.message || "Worker abgestürzt."));

      const request: AnalysisRequest = {
        channels: audio.channels,
        durationMs: audio.durationSeconds * 1000,
        title: stripExtension(file.name),
        artist: "",
      };

      worker.postMessage(
        request,
        audio.channels.map((channel) => channel.buffer),
      );
    });

    await writeAnalysis(key, analysis);
    return analysis;
  })().finally(() => {
    worker?.terminate();
    worker = undefined;
  });

  return {
    result,
    cancel: () => {
      cancelled = true;
      worker?.terminate();
      worker = undefined;
    },
  };
}
