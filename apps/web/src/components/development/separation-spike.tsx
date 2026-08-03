"use client";

import { useMemo, useState } from "react";

import { ChartPreview } from "@/components/development/chart-preview";
import {
  PitchControls,
  SegmentationControls,
} from "@/components/development/segmentation-controls";
import { Button } from "@/components/ui/button";
import { decodeForModel, encodeWav } from "@/lib/analysis/audio-io";
import { buildChart, DEFAULT_SEGMENTATION, type Segmentation } from "@/lib/analysis/build-notes";
import { ANALYSIS_VERSION } from "@/lib/analysis/types";
import type { AudioFile } from "@/lib/song-explorer/types";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { DEFAULT_PITCH_OPTIONS, trackPitch, type PitchOptions } from "@/lib/analysis/pitch-track";
import { sonify, type Sonification } from "@/lib/development/sonify";
import {
  loadModel,
  MODELS,
  separateVocals,
  type ModelKey,
  type Progress,
  type SeparationResult,
} from "@/lib/analysis/separation";

/**
 * Messversuch zur Stem-Trennung im Browser. Bewusst keine schöne Oberfläche — die Frage
 * ist allein: Wie lange dauert es, und ist die Stimme brauchbar?
 */
export const SeparationSpike = () => {
  const [file, setFile] = useState<File>();
  const [modelKey, setModelKey] = useState<ModelKey>("webgpu");
  const [webGpu, setWebGpu] = useState(true);
  const [limitSeconds, setLimitSeconds] = useState(30);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress>();
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<SeparationResult>();
  const [vocalsUrl, setVocalsUrl] = useState<string>();
  const [segmentation, setSegmentation] = useState<Segmentation>(DEFAULT_SEGMENTATION);
  const [pitchOptions, setPitchOptions] = useState<PitchOptions>(DEFAULT_PITCH_OPTIONS);
  const [analysedMs, setAnalysedMs] = useState(0);
  const [playback, setPlayback] = useState<Sonification>();
  const [error, setError] = useState<string>();

  // Kurve und Chart hängen an den Reglern: Die Kurve kostet einen Durchlauf über den
  // Gesangs-Stem (Sekunden), die Noten daraus nur Millisekunden.
  const curve = useMemo(
    () => (result ? trackPitch(result.vocals, pitchOptions) : undefined),
    [result, pitchOptions],
  );

  const chart = useMemo(
    () =>
      curve && file ? buildChart(curve, { title: file.name, artist: "", segmentation }) : undefined,
    [curve, file, segmentation],
  );

  const setResultInStore = useAnalysisStore((state) => state.setResult);
  const startPlaying = usePlayerStore((state) => state.start);

  /**
   * Sprung in den echten Spielmodus. Der Player erwartet einen Datei-Handle aus der
   * Bibliothek; hier liegt nur eine hochgeladene Datei. Der Handle wird deshalb
   * nachgebildet — er braucht nur `getFile`.
   */
  const playInGameMode = () => {
    if (!file || !chart || !curve) return;
    stopPlayback();

    const song: AudioFile = {
      name: file.name,
      path: `werkbank/${file.name}`,
      handle: { getFile: async () => file } as unknown as FileSystemFileHandle,
    };

    setResultInStore(song.path, {
      chart,
      pitch: curve,
      meta: {
        model: "werkbank",
        version: ANALYSIS_VERSION,
        createdAt: new Date().toISOString(),
        durationMs: analysedMs,
        separationMs: result?.totalMs ?? 0,
      },
    });

    startPlaying(song);
  };

  /**
   * Chart als Datei, zum Mitliefern neben einem Beispielsong.
   *
   * Ohne die Tonhöhenkurve: Die ist mit einem Rahmen alle 10 ms der weitaus größte Teil, und
   * außerhalb der Analyse fasst sie niemand an — weder Spielbildschirm noch Wertung.
   */
  const exportChart = () => {
    if (!file || !chart) return;

    const payload = {
      chart,
      meta: {
        model: modelKey,
        version: ANALYSIS_VERSION,
        createdAt: new Date().toISOString(),
        durationMs: analysedMs,
        separationMs: result?.totalMs ?? 0,
      },
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );

    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name.replace(/\.[^.]+$/, "")}.chart.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const play = (withVocals: boolean) => {
    if (!chart) return;
    playback?.stop();
    setPlayback(sonify(chart, withVocals ? result?.vocals : undefined));
  };

  const stopPlayback = () => {
    playback?.stop();
    setPlayback(undefined);
  };

  const note = (message: string) =>
    setLog((entries) => [...entries, `${new Date().toLocaleTimeString()} — ${message}`]);

  const run = async () => {
    if (!file) return;

    setRunning(true);
    setError(undefined);
    setResult(undefined);
    setVocalsUrl(undefined);
    setLog([]);

    try {
      note(`WebGPU im Browser: ${"gpu" in navigator ? "verfügbar" : "nicht verfügbar"}`);

      const decodeStart = performance.now();
      const audio = await decodeForModel(file, limitSeconds > 0 ? limitSeconds : undefined);
      note(
        `Dekodiert: ${audio.durationSeconds.toFixed(1)} s in ${Math.round(performance.now() - decodeStart)} ms`,
      );

      const modelStart = performance.now();
      const model = await loadModel(modelKey, setProgress);
      note(
        `Modell bereit: ${Math.round(model.byteLength / 1_000_000)} MB in ${Math.round(performance.now() - modelStart)} ms`,
      );

      // Nur das gefaltete Modell läuft auf der GPU — bei den anderen bricht die Session ab.
      const useWebGpu = webGpu && modelKey === "webgpu";
      if (webGpu && !useWebGpu) note("Modell ist nicht WebGPU-tauglich — es läuft auf WASM.");

      const separation = await separateVocals(model, audio.channels, setProgress, useWebGpu);
      note(
        `Trennung fertig: ${(separation.totalMs / 1000).toFixed(1)} s für ${audio.durationSeconds.toFixed(1)} s Audio`,
      );

      setResult(separation);
      setVocalsUrl(URL.createObjectURL(encodeWav(separation.vocals)));

      // Die Kurve entsteht abgeleitet aus dem Stem und den Reglern, nicht hier.
      setAnalysedMs(audio.durationSeconds * 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      setError(message);
      note(`Abbruch: ${message}`);
    } finally {
      setRunning(false);
      setProgress(undefined);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Spike: Stem-Trennung</h1>
        <p className="text-sm text-muted-foreground">
          HT-Demucs als ONNX im Browser. Misst Ladezeit, Rechenzeit und liefert den Gesangs-Stem zum
          Anhören.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <input
          type="file"
          accept="audio/*"
          onChange={(event) => setFile(event.target.files?.[0])}
          className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />

        <label className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          Modell
          <select
            value={modelKey}
            onChange={(event) => setModelKey(event.target.value as ModelKey)}
            className="rounded-md border border-input bg-muted px-2 py-1 text-sm"
          >
            {Object.entries(MODELS).map(([key, model]) => (
              <option key={key} value={key}>
                {model.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          Nur die ersten Sekunden (0 = ganzer Song)
          <input
            type="number"
            min={0}
            value={limitSeconds}
            onChange={(event) => setLimitSeconds(Number(event.target.value))}
            className="w-20 rounded-md border border-input bg-muted px-2 py-1 text-sm"
          />
        </label>

        <label className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
          WebGPU bevorzugen (greift nur beim WebGPU-tauglichen Modell)
          <input
            type="checkbox"
            checked={webGpu}
            onChange={(event) => setWebGpu(event.target.checked)}
          />
        </label>

        <div>
          <Button variant="outline" onClick={() => void run()} disabled={!file || running}>
            {running ? "läuft …" : "Trennung starten"}
          </Button>
        </div>

        {progress && (
          <div className="flex flex-col gap-1">
            <div className="h-1 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full bg-voice transition-[width]"
                style={{ width: `${Math.round((progress.ratio ?? 0) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress.message}</p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {result && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Ergebnis</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Rechenzeit</dt>
            <dd className="font-mono">{(result.totalMs / 1000).toFixed(1)} s</dd>
            <dt className="text-muted-foreground">Faktor zur Echtzeit</dt>
            <dd className="font-mono">{result.realtimeFactor.toFixed(2)}×</dd>
            <dt className="text-muted-foreground">Blöcke</dt>
            <dd className="font-mono">{result.chunkCount}</dd>
            <dt className="text-muted-foreground">Backend</dt>
            <dd className="font-mono">{result.provider}</dd>
          </dl>

          {vocalsUrl && (
            <div className="flex flex-col gap-2">
              <audio controls src={vocalsUrl} className="w-full" />
              <a href={vocalsUrl} download="vocals.wav" className="text-sm text-voice">
                vocals.wav herunterladen
              </a>
            </div>
          )}
        </section>
      )}

      {chart && curve && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">
            Balken aus der Analyse
            <span className="ml-2 font-normal text-muted-foreground">
              {chart.phrases.length} Phrasen ·{" "}
              {chart.phrases.reduce((sum, phrase) => sum + phrase.notes.length, 0)} Noten
            </span>
          </h2>

          <ChartPreview
            chart={chart}
            curve={curve}
            durationMs={analysedMs}
            positionMs={playback?.positionMs}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={playInGameMode}>Im Spielmodus testen</Button>
            <Button variant="outline" onClick={() => play(false)}>
              Nur Noten anhören
            </Button>
            <Button variant="outline" onClick={() => play(true)}>
              Noten + Gesang
            </Button>
            <Button variant="outline" onClick={stopPlayback} disabled={!playback}>
              Stopp
            </Button>
            <Button variant="outline" onClick={exportChart}>
              Chart exportieren
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Dünne Linie: rohe Tonhöhenkurve. Grüne Balken: was die Segmentierung daraus gemacht hat.
            Das Bild ist schwer zu beurteilen — die Vertonung nicht: Klingt sie nach dem Song,
            stimmen die Noten. Zusammen mit dem Gesang hört man außerdem, ob sie zeitlich sitzen.
          </p>
        </section>
      )}

      {curve && (
        <>
          <PitchControls value={pitchOptions} onChange={setPitchOptions} />
          <SegmentationControls value={segmentation} onChange={setSegmentation} />
        </>
      )}

      {log.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Protokoll</h2>
          <ul className="flex flex-col gap-0.5 font-mono text-xs text-muted-foreground">
            {log.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
