// Nur die Typen statisch — der eigentliche Import passiert erst im Browser (siehe `getOrt`).
// Beim Prerendern auf dem Server bricht die Bibliothek sonst ab, weil sie ihre
// WASM-Pfade nicht auflösen kann.
import type * as Ort from "onnxruntime-web/webgpu";

/**
 * Spike: Stem-Trennung mit HT-Demucs als ONNX-Modell im Browser.
 *
 * Der Vertrag stammt aus der Referenz-Implementierung des Modells
 * (https://huggingface.co/StemSplitio/htdemucs-onnx, `infer.py`):
 *
 *   Eingabe  "mix"    float32 [1, 2, 343980]   — 7,8 s Stereo bei 44,1 kHz
 *   Ausgabe  "stems"  float32 [1, 4, 2, N]     — Reihenfolge: drums, bass, other, vocals
 *
 * Die Blöcke überlappen sich um ein Viertel und werden mit einer Rampe überblendet,
 * sonst hört man die Schnittkanten.
 *
 * Läuft bewusst auf dem Hauptthread: Beim Messen soll nichts zwischen der Zahl und mir
 * stehen. Für den Einsatz in der App gehört das in einen Worker.
 */

export const SAMPLE_RATE = 44100;
const SEGMENT_SAMPLES = 343_980; // 7,8 s
const OVERLAP = SEGMENT_SAMPLES / 4;
const STRIDE = SEGMENT_SAMPLES - OVERLAP;

/**
 * Reihenfolge der Ausgabe. Das 6-Stem-Modell hängt hinten "guitar" und "piano" an —
 * "vocals" bleibt in beiden Fällen an vierter Stelle, deshalb reicht diese Liste zum
 * Herausrechnen des Gesangs.
 */
export const STEMS = ["drums", "bass", "other", "vocals"] as const;
export type StemName = (typeof STEMS)[number];

const MODEL_BASE = "https://huggingface.co/StemSplitio/htdemucs-onnx/resolve/main";
const WEBGPU_BASE = "https://huggingface.co/kramp/htdemucs-6s-webgpu-onnx/resolve/main";

export const MODELS = {
  /**
   * Der WebGPU-Backend von onnxruntime-web kann den `ConstantOfShape`-Knoten im
   * eingebauten ISTFT nicht ausführen — die Session bricht beim Erstellen ab. Diese
   * Variante hat den Knoten vorab zu einer Konstanten gefaltet (bit-identisches Ergebnis)
   * und ist deshalb die einzige, die auf der GPU läuft. Sie liefert sechs Stems statt
   * vier; "vocals" steht in beiden Fällen an vierter Stelle.
   */
  webgpu: { url: `${WEBGPU_BASE}/htdemucs_6s.onnx`, label: "6-Stem, WebGPU-tauglich (≈285 MB)" },
  fp16: {
    url: `${MODEL_BASE}/htdemucs_fp16weights.onnx`,
    label: "4-Stem fp16, nur WASM (≈166 MB)",
  },
  fp32: { url: `${MODEL_BASE}/htdemucs.onnx`, label: "4-Stem fp32, nur WASM (≈316 MB)" },
} as const;
export type ModelKey = keyof typeof MODELS;

const CACHE_NAME = "vocalwonder-models";

let ortPromise: Promise<typeof Ort> | undefined;

/** Lädt die Laufzeitumgebung einmalig und stellt sie auf den Browser ein. */
async function getOrt(): Promise<typeof Ort> {
  ortPromise ??= import("onnxruntime-web/webgpu").then((ort) => {
    // Die WASM-Binärdateien kommen vom CDN, statt sie durch den Next-Build zu schleusen.
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
    // Mehrere Threads brauchen COOP/COEP-Header. Ohne die scheitert die Initialisierung,
    // deshalb hier ehrlich auf das beschränken, was die Seite tatsächlich darf.
    ort.env.wasm.numThreads = globalThis.crossOriginIsolated ? navigator.hardwareConcurrency : 1;
    return ort;
  });

  return ortPromise;
}

export interface Progress {
  stage: "download" | "session" | "inference";
  /** 0–1, wenn bekannt. */
  ratio?: number;
  message: string;
}

/** Lädt das Modell und legt es im Cache Storage ab — der zweite Lauf startet sofort. */
export async function loadModel(
  key: ModelKey,
  onProgress: (progress: Progress) => void,
): Promise<ArrayBuffer> {
  const { url } = MODELS[key];
  const cache = await caches.open(CACHE_NAME);

  const cached = await cache.match(url);
  if (cached) {
    onProgress({ stage: "download", ratio: 1, message: "Modell aus dem Cache" });
    return cached.arrayBuffer();
  }

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Modell nicht ladbar (${response.status})`);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.length;
    onProgress({
      stage: "download",
      ratio: total > 0 ? received / total : undefined,
      message: `Modell lädt … ${formatMb(received)}${total > 0 ? ` / ${formatMb(total)}` : ""}`,
    });
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }

  // Kopie für den Cache, damit der Puffer hier nicht abgeräumt wird.
  await cache.put(url, new Response(bytes.slice().buffer));
  return bytes.buffer;
}

export interface SeparationResult {
  vocals: Float32Array[];
  /** Wie viele Sekunden Rechenzeit pro Sekunde Audio. Unter 1 wäre Echtzeit. */
  realtimeFactor: number;
  totalMs: number;
  chunkCount: number;
  provider: string;
}

/**
 * Trennt den Gesang heraus. Die anderen drei Stems werden verworfen — sie behalten hieße
 * bei einem Vier-Minuten-Song über 300 MB im Speicher zu halten, und wir brauchen sie nicht.
 */
export async function separateVocals(
  model: ArrayBuffer,
  mix: Float32Array[],
  onProgress: (progress: Progress) => void,
  preferWebGpu: boolean,
): Promise<SeparationResult> {
  const ort = await getOrt();

  const executionProviders: Ort.InferenceSession.ExecutionProviderConfig[] = preferWebGpu
    ? ["webgpu", "wasm"]
    : ["wasm"];

  onProgress({ stage: "session", message: "Modell wird initialisiert …" });

  const session = await ort.InferenceSession.create(model, {
    executionProviders,
    graphOptimizationLevel: "all",
  });

  const [left, right = left] = mix;
  if (!left) throw new Error("Kein Audio übergeben.");

  const total = left.length;
  const chunkCount = Math.max(1, Math.ceil(total / STRIDE));

  const outLeft = new Float32Array(total);
  const outRight = new Float32Array(total);
  const weightSum = new Float32Array(total);
  const window = makeWindow();
  const input = new Float32Array(2 * SEGMENT_SAMPLES);

  const startedAt = performance.now();

  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * STRIDE;
    const end = Math.min(start + SEGMENT_SAMPLES, total);
    const length = end - start;

    input.fill(0);
    input.set(left.subarray(start, end), 0);
    input.set(right.subarray(start, end), SEGMENT_SAMPLES);

    const output = await session.run({
      mix: new ort.Tensor("float32", input, [1, 2, SEGMENT_SAMPLES]),
    });

    const stems = output.stems?.data as Float32Array | undefined;
    if (!stems) throw new Error("Modell lieferte keine Ausgabe namens 'stems'.");

    // Ausgabe ist [1, 4, 2, N]; vocals ist der vierte Stem.
    const vocalsOffset = STEMS.indexOf("vocals") * 2 * SEGMENT_SAMPLES;

    for (let i = 0; i < length; i += 1) {
      const w = window[i] ?? 1;
      outLeft[start + i] += (stems[vocalsOffset + i] ?? 0) * w;
      outRight[start + i] += (stems[vocalsOffset + SEGMENT_SAMPLES + i] ?? 0) * w;
      weightSum[start + i] += w;
    }

    const done = index + 1;
    onProgress({
      stage: "inference",
      ratio: done / chunkCount,
      message: `Block ${done} von ${chunkCount}`,
    });

    // Dem Browser Luft zum Atmen geben, sonst friert die Fortschrittsanzeige ein.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  for (let i = 0; i < total; i += 1) {
    const w = Math.max(weightSum[i] ?? 0, 1e-8);
    outLeft[i] = (outLeft[i] ?? 0) / w;
    outRight[i] = (outRight[i] ?? 0) / w;
  }

  const totalMs = performance.now() - startedAt;
  await session.release();

  return {
    vocals: [outLeft, outRight],
    totalMs,
    chunkCount,
    realtimeFactor: totalMs / 1000 / (total / SAMPLE_RATE),
    provider: preferWebGpu ? "webgpu (Rückfall wasm)" : "wasm",
  };
}

/** Lineare Rampe über den Überlappungsbereich — ohne die hört man jeden Blockwechsel. */
function makeWindow(): Float32Array {
  const window = new Float32Array(SEGMENT_SAMPLES).fill(1);
  for (let i = 0; i < OVERLAP; i += 1) {
    const value = i / OVERLAP;
    window[i] = value;
    window[SEGMENT_SAMPLES - 1 - i] = value;
  }
  return window;
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}
