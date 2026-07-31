import { allNotes, midiToHz, type Chart } from "@vocalwonder/core";

import { SAMPLE_RATE } from "@/lib/analysis/separation";

/**
 * Macht die erzeugten Noten hörbar.
 *
 * Ein Balkenbild lässt sich kaum beurteilen — eine Melodie schon. Klingt die Vertonung
 * nach dem Song, hat die Segmentierung funktioniert. Klingt sie nach zufälligem Gepiepse,
 * stimmen die Schwellen nicht. Zusammen mit dem Gesangs-Stem hört man außerdem sofort, ob
 * die Noten zeitlich sitzen oder daneben liegen.
 */

export interface Sonification {
  stop: () => void;
  /** Position seit dem Start in Millisekunden — für den Playhead im Bild. */
  positionMs: () => number;
}

export function sonify(chart: Chart, vocals?: Float32Array[]): Sonification {
  const context = new AudioContext();

  const master = context.createGain();
  master.gain.value = 0.9;
  master.connect(context.destination);

  // Kleiner Vorlauf, damit die erste Note nicht abgeschnitten wird.
  const startedAt = context.currentTime + 0.15;

  for (const note of allNotes(chart)) {
    const from = startedAt + note.startMs / 1000;
    const to = from + note.durationMs / 1000;

    const oscillator = context.createOscillator();
    // Dreieck statt Sinus: durchsetzungsfähiger neben der Stimme, aber nicht schrill.
    oscillator.type = "triangle";
    oscillator.frequency.value = midiToHz(note.midi);

    // Kurze Rampen an den Enden — harte Kanten knacken hörbar.
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, from);
    envelope.gain.linearRampToValueAtTime(0.25, from + 0.01);
    envelope.gain.setValueAtTime(0.25, Math.max(to - 0.02, from + 0.011));
    envelope.gain.linearRampToValueAtTime(0, to);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(from);
    oscillator.stop(to + 0.02);
  }

  if (vocals?.[0]) {
    const [left, right = left] = vocals;
    const buffer = context.createBuffer(2, left.length, SAMPLE_RATE);
    // `copyToChannel` verlangt einen eigenen ArrayBuffer; die Analysepuffer sind allgemeiner
    // typisiert, deshalb hier eine Kopie.
    buffer.copyToChannel(new Float32Array(left), 0);
    buffer.copyToChannel(new Float32Array(right), 1);

    const source = context.createBufferSource();
    source.buffer = buffer;

    const gain = context.createGain();
    gain.gain.value = 0.7;

    source.connect(gain);
    gain.connect(master);
    source.start(startedAt);
  }

  return {
    stop: () => void context.close(),
    positionMs: () => Math.max(0, (context.currentTime - startedAt) * 1000),
  };
}
