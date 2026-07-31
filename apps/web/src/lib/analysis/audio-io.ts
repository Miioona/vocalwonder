import { SAMPLE_RATE } from "./separation";

export interface DecodedAudio {
  channels: Float32Array[];
  durationSeconds: number;
}

/**
 * Dekodiert eine Datei und bringt sie auf 44,1 kHz Stereo — das erwartet das Modell.
 * Optional nur die ersten Sekunden, damit eine Messung nicht vier Minuten dauert.
 */
export async function decodeForModel(file: File, maxSeconds?: number): Promise<DecodedAudio> {
  return decodeBytesForModel(await file.arrayBuffer(), maxSeconds);
}

/**
 * Wie `decodeForModel`, aber aus bereits gelesenen Bytes. **Achtung:** `decodeAudioData`
 * übernimmt den Puffer und macht ihn danach unbrauchbar — wer die Bytes noch braucht
 * (etwa zum Hashen), muss das vorher erledigen.
 */
export async function decodeBytesForModel(
  bytes: ArrayBuffer,
  maxSeconds?: number,
): Promise<DecodedAudio> {
  const context = new AudioContext();
  const decoded = await context.decodeAudioData(bytes);
  void context.close();

  const seconds = Math.min(decoded.duration, maxSeconds ?? decoded.duration);
  const length = Math.ceil(seconds * SAMPLE_RATE);

  // Das Umrechnen der Abtastrate übernimmt der OfflineAudioContext.
  const offline = new OfflineAudioContext(2, length, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();

  return {
    channels: [rendered.getChannelData(0), rendered.getChannelData(1)],
    durationSeconds: seconds,
  };
}

/** 16-Bit-PCM-WAV zum Anhören und Herunterladen. */
export function encodeWav(channels: Float32Array[], sampleRate = SAMPLE_RATE): Blob {
  const [left, right = left] = channels;
  if (!left) throw new Error("Keine Kanäle übergeben.");

  const frames = left.length;
  const buffer = new ArrayBuffer(44 + frames * 4);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + frames * 4, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 2, true); // Stereo
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, frames * 4, true);

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    view.setInt16(offset, toPcm16(left[i] ?? 0), true);
    view.setInt16(offset + 2, toPcm16(right[i] ?? 0), true);
    offset += 4;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function toPcm16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped * 32767);
}
