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
/** Unter diesem Wert ist der "Ton" meist Rauschen, Atem oder Musik aus den Lautsprechern. */
const MIN_CLARITY = 0.85;
/** Gesang außerhalb dieses Bereichs gibt es nicht — was draußen liegt, ist ein Artefakt. */
const MIN_HZ = 65;
const MAX_HZ = 1200;

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

export class Microphone {
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private detector?: PitchDetector<Float32Array>;
  /** Explizit `ArrayBuffer`: `getFloatTimeDomainData` nimmt keine geteilten Puffer an. */
  private samples?: Float32Array<ArrayBuffer>;
  private sampleRate = 48000;

  async start(context: AudioContext): Promise<void> {
    // Die Browser-DSP muss aus: Echokompensation und Rauschunterdrückung zerstören die
    // Grundfrequenz, und die automatische Aussteuerung pumpt den Pegel. Damit wird die
    // Tonhöhenerkennung unbrauchbar.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    // Glättung würde die Wellenform verfälschen — wir wollen die Rohdaten.
    analyser.smoothingTimeConstant = 0;

    this.source = context.createMediaStreamSource(this.stream);
    this.source.connect(analyser);
    // Bewusst **nicht** an die Ausgabe hängen, sonst hört man sich selbst mit Verzögerung.

    this.analyser = analyser;
    this.sampleRate = context.sampleRate;
    this.samples = new Float32Array(analyser.fftSize);

    const detector = PitchDetector.forFloat32Array(analyser.fftSize);
    detector.clarityThreshold = MIN_CLARITY;
    this.detector = detector;
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

    const usable = clarity >= MIN_CLARITY && frequencyHz >= MIN_HZ && frequencyHz <= MAX_HZ;
    if (!usable) return { clarity, level };

    return { midi: hzToMidi(frequencyHz), frequencyHz, clarity, level };
  }

  stop(): void {
    this.source?.disconnect();
    this.analyser?.disconnect();
    for (const track of this.stream?.getTracks() ?? []) track.stop();

    this.stream = undefined;
    this.source = undefined;
    this.analyser = undefined;
    this.detector = undefined;
    this.samples = undefined;
  }
}
