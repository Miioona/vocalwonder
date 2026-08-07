import { hzToMidi } from "@vocalwonder/core";
import { PitchDetector } from "pitchy";

/**
 * Mikrofoneingang mit Tonhöhenerkennung (McLeod Pitch Method über `pitchy`).
 *
 * Gelesen wird über einen `AnalyserNode` statt über einen AudioWorklet: Der Analyser
 * liefert genau das Fenster, das der Algorithmus braucht, und die Erkennung läuft im
 * Renderframe mit. Ein Worklet hätte einen eigenen Audiothread — das lohnt erst, wenn
 * uns die Erkennung nachweislich Frames kostet.
 */

/** 2048 Samples ≈ 43 ms bei 48 kHz — genug für tiefe Männerstimmen, kurz genug für Reaktion. */
const FFT_SIZE = 2048;
/**
 * Empfindlichkeit 0–1 auf die beiden Schwellen abgebildet, die dahinterstecken.
 *
 * Unempfindlich (0): nur klare, laute Töne zählen. Empfindlich (1): auch leise und
 * unsaubere — dann rutschen aber Atem und Hintergrundgeräusche mit durch.
 */
const CLARITY_AT_LOW = 0.95;
const CLARITY_AT_HIGH = 0.7;
const VOLUME_DB_AT_LOW = -25;
const VOLUME_DB_AT_HIGH = -55;

/**
 * Höchste Verstärkung beim Mithören. Der rohe Mikrofonpegel ist leise — wir schalten die
 * automatische Aussteuerung des Browsers ab, weil sie die Tonhöhenerkennung ruiniert. Bei
 * Faktor 1 (unverstärkt) geht die eigene Stimme neben der Musik unter.
 */
const MONITOR_MAX_GAIN = 5;
/** Gesang außerhalb dieses Bereichs gibt es nicht — was draußen liegt, ist ein Artefakt. */
const MIN_HZ = 65;
const MAX_HZ = 1200;

export interface MonitorSettings {
  enabled: boolean;
  volume: number;
}

export interface MicrophoneOptions {
  deviceId?: string;
  /** 0–1, siehe oben. */
  sensitivity?: number;
  monitor?: MonitorSettings;
}

export interface PitchSample {
  /** MIDI-Note als Kommazahl, `undefined` wenn gerade nichts Verwertbares kommt. */
  midi?: number;
  frequencyHz?: number;
  /** 0–1, wie eindeutig der Ton war. */
  clarity: number;
  /** 0–1, grober Pegel für die Aussteuerungsanzeige. */
  level: number;
}

const SILENT: PitchSample = { clarity: 0, level: 0 };

/**
 * Den Mikrofonstrom holen — notfalls ohne Gerätewunsch.
 *
 * Geräte-IDs gelten je Browser und Profil. Steht in den Einstellungen eine ID aus einem
 * anderen Browser, kennt dieser sie nicht. Chrome nimmt dann stillschweigend das
 * Standardgerät, Firefox bricht ab ("The object can not be found here") — deshalb hier ein
 * ausdrücklicher zweiter Versuch, statt sich auf das Wohlwollen des Browsers zu verlassen.
 */
async function openStream(deviceId?: string): Promise<MediaStream> {
  // Die Browser-DSP muss aus: Echokompensation und Rauschunterdrückung zerstören die
  // Grundfrequenz, und die automatische Aussteuerung pumpt den Pegel. Damit wird die
  // Tonhöhenerkennung unbrauchbar.
  const base: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };

  if (!deviceId) return navigator.mediaDevices.getUserMedia({ audio: base });

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { ...base, deviceId } });
  } catch (err) {
    // Eine Absage des Users darf nicht umgangen werden — nur ein unbekanntes Gerät.
    if (err instanceof DOMException && err.name === "NotAllowedError") throw err;

    console.error("[mic] Gerät nicht gefunden, nehme das Standardgerät", err);
    return navigator.mediaDevices.getUserMedia({ audio: base });
  }
}

export class Microphone {
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private detector?: PitchDetector<Float32Array>;
  /** Explizit `ArrayBuffer`: `getFloatTimeDomainData` nimmt keine geteilten Puffer an. */
  private samples?: Float32Array<ArrayBuffer>;
  private sampleRate = 48000;
  /** Mithören: Mikrofon → Verstärkung → Ausgabe. Lautstärke 0 heißt aus. */
  private monitorGain?: GainNode;
  private clarityThreshold = clarityFor(0.5);

  async start(context: AudioContext, options: MicrophoneOptions = {}): Promise<void> {
    // Die Browser-DSP muss aus: Echokompensation und Rauschunterdrückung zerstören die
    // Grundfrequenz, und die automatische Aussteuerung pumpt den Pegel. Damit wird die
    // Tonhöhenerkennung unbrauchbar.
    this.stream = await openStream(options.deviceId);

    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    // Glättung würde die Wellenform verfälschen — wir wollen die Rohdaten.
    analyser.smoothingTimeConstant = 0;

    this.source = context.createMediaStreamSource(this.stream);
    this.source.connect(analyser);

    // Mithören ist ein eigener Zweig zur Ausgabe. Standardmäßig stumm — ohne Kopfhörer
    // gibt es Rückkopplung, und die Verzögerung wirft Sänger aus dem Takt.
    this.monitorGain = context.createGain();
    this.monitorGain.gain.value = 0;
    this.source.connect(this.monitorGain);
    this.monitorGain.connect(context.destination);

    this.analyser = analyser;
    this.sampleRate = context.sampleRate;
    this.samples = new Float32Array(analyser.fftSize);

    this.detector = PitchDetector.forFloat32Array(analyser.fftSize);
    this.setSensitivity(options.sensitivity ?? 0.5);
    this.setMonitor(options.monitor ?? { enabled: false, volume: 0 });
  }

  /** Kann jederzeit geändert werden, auch während gesungen wird. */
  setSensitivity(sensitivity: number): void {
    this.clarityThreshold = clarityFor(sensitivity);
    if (!this.detector) return;

    this.detector.clarityThreshold = this.clarityThreshold;
    this.detector.minVolumeDecibels = mix(VOLUME_DB_AT_LOW, VOLUME_DB_AT_HIGH, sensitivity);
  }

  setMonitor({ enabled, volume }: MonitorSettings): void {
    if (!this.monitorGain) return;

    // Quadratisch statt linear: unten feine Abstufung, oben genug Reserve.
    const normalized = Math.min(Math.max(volume, 0), 1);
    this.monitorGain.gain.value = enabled ? normalized ** 2 * MONITOR_MAX_GAIN : 0;
  }

  /** Liest den aktuellen Ton. Günstig genug, um pro Frame aufgerufen zu werden. */
  read(): PitchSample {
    const { analyser, detector, samples } = this;
    if (!analyser || !detector || !samples) return SILENT;

    analyser.getFloatTimeDomainData(samples);

    let sumOfSquares = 0;
    for (const value of samples) sumOfSquares += value * value;
    const level = Math.min(1, Math.sqrt(sumOfSquares / samples.length) * 4);

    const [frequencyHz, clarity] = detector.findPitch(samples, this.sampleRate);

    const usable =
      clarity >= this.clarityThreshold && frequencyHz >= MIN_HZ && frequencyHz <= MAX_HZ;
    if (!usable) return { clarity, level };

    return { midi: hzToMidi(frequencyHz), frequencyHz, clarity, level };
  }

  stop(): void {
    this.monitorGain?.disconnect();
    this.source?.disconnect();
    this.analyser?.disconnect();
    for (const track of this.stream?.getTracks() ?? []) track.stop();

    this.stream = undefined;
    this.source = undefined;
    this.monitorGain = undefined;
    this.analyser = undefined;
    this.detector = undefined;
    this.samples = undefined;
  }
}

function mix(low: number, high: number, ratio: number): number {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return low + (high - low) * clamped;
}

function clarityFor(sensitivity: number): number {
  return mix(CLARITY_AT_LOW, CLARITY_AT_HIGH, sensitivity);
}
