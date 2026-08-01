"use client";

import { SettingSlider } from "@/components/settings/setting-slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_SEGMENTATION, type Segmentation } from "@/lib/analysis/build-notes";
import { DEFAULT_PITCH_OPTIONS, type PitchOptions } from "@/lib/analysis/pitch-track";

interface PitchControlsProps {
  value: PitchOptions;
  onChange: (next: PitchOptions) => void;
}

/**
 * Die Schwellen der Tonhöhenerkennung.
 *
 * Anders als die Segmentierung kostet eine Änderung hier einen kompletten Durchlauf über
 * den Gesangs-Stem — spürbar, aber Sekunden statt Minuten, weil die Trennung schon fertig ist.
 */
export const PitchControls = ({ value, onChange }: PitchControlsProps) => {
  const set = (changes: Partial<PitchOptions>) => onChange({ ...value, ...changes });

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Tonhöhenerkennung</h2>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_PITCH_OPTIONS)}>
          Zurücksetzen
        </Button>
      </div>

      <SettingSlider
        label="Klarheitsschwelle"
        commitOnly
        format={(v) => v.toFixed(2)}
        display={value.minClarity.toFixed(2)}
        value={value.minClarity}
        min={0.3}
        max={0.95}
        step={0.05}
        onChange={(next) => set({ minClarity: next })}
        hint="Niedriger erkennt die Stimme durchgängiger, lässt aber auch Rauschen als Ton durch."
      />

      <SettingSlider
        label="Fensterbreite"
        commitOnly
        format={(v) => `${v} Samples`}
        display={`${value.windowSize} Samples`}
        value={value.windowSize}
        min={1024}
        max={8192}
        step={1024}
        onChange={(next) => set({ windowSize: next })}
        hint="Größer hilft bei tiefen Stimmen, verschmiert aber schnelle Silben."
      />

      <SettingSlider
        label="Tiefster Ton"
        commitOnly
        format={(v) => `${v} Hz`}
        display={`${value.minHz} Hz`}
        value={value.minHz}
        min={40}
        max={200}
        step={5}
        onChange={(next) => set({ minHz: next })}
      />

      <SettingSlider
        label="Höchster Ton"
        commitOnly
        format={(v) => `${v} Hz`}
        display={`${value.maxHz} Hz`}
        value={value.maxHz}
        min={600}
        max={2000}
        step={50}
        onChange={(next) => set({ maxHz: next })}
      />
    </section>
  );
};

interface SegmentationControlsProps {
  value: Segmentation;
  onChange: (next: Segmentation) => void;
}

/**
 * Die Schwellen der Notenbildung als Regler.
 *
 * Möglich, weil die teure Trennung einmal läuft und die Segmentierung danach Millisekunden
 * dauert: Ein Zug am Regler zeichnet und vertont das Ergebnis sofort neu, statt vier Minuten
 * Rechnen zu verlangen.
 */
export const SegmentationControls = ({ value, onChange }: SegmentationControlsProps) => {
  const set = (changes: Partial<Segmentation>) => onChange({ ...value, ...changes });

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Segmentierung</h2>
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_SEGMENTATION)}>
          Zurücksetzen
        </Button>
      </div>

      <SettingSlider
        label="Glättung"
        commitOnly
        format={(v) => `${v} Rahmen`}
        display={`${value.medianWindow} Rahmen`}
        value={value.medianWindow}
        min={1}
        max={15}
        step={2}
        onChange={(next) => set({ medianWindow: next })}
        hint="Größer glättet Vibrato und Ausreißer, verschluckt aber kurze Noten."
      />

      <SettingSlider
        label="Stille-Schwelle"
        commitOnly
        format={(v) => `${Math.round(v * 100)} %`}
        display={`${Math.round(value.silenceRatio * 100)} %`}
        value={value.silenceRatio}
        min={0}
        max={0.3}
        step={0.01}
        onChange={(next) => set({ silenceRatio: next })}
        hint="Anteil der lautesten Stelle. Höher blendet Atem aus, kann aber leise Passagen verlieren."
      />

      <SettingSlider
        label="Kürzeste Note"
        commitOnly
        format={(v) => `${v} ms`}
        display={`${value.minNoteMs} ms`}
        value={value.minNoteMs}
        min={40}
        max={300}
        step={10}
        onChange={(next) => set({ minNoteMs: next })}
        hint="Kürzeres wird verworfen. Für Rap niedriger, für Balladen höher."
      />

      <SettingSlider
        label="Lücken überbrücken"
        commitOnly
        format={(v) => `${v} ms`}
        display={`${value.maxBridgeMs} ms`}
        value={value.maxBridgeMs}
        min={0}
        max={200}
        step={10}
        onChange={(next) => set({ maxBridgeMs: next })}
        hint="Pausen darunter unterbrechen eine Note nicht — gedacht für Konsonanten."
      />

      <SettingSlider
        label="Tonhöhen-Toleranz"
        commitOnly
        format={(v) => `${v.toFixed(2)} Halbtöne`}
        display={`${value.pitchTolerance.toFixed(2)} Halbtöne`}
        value={value.pitchTolerance}
        min={0.1}
        max={2}
        step={0.05}
        onChange={(next) => set({ pitchTolerance: next })}
        hint="Wie weit die Stimme wandern darf, ohne dass eine neue Note beginnt."
      />

      <SettingSlider
        label="Wechsel braucht"
        commitOnly
        format={(v) => `${v} ms`}
        display={`${value.switchMs} ms`}
        value={value.switchMs}
        min={10}
        max={300}
        step={10}
        onChange={(next) => set({ switchMs: next })}
        hint="So lange muss die Abweichung anhalten, bevor sie als neuer Ton zählt."
      />

      <SettingSlider
        label="Notenversatz"
        commitOnly
        format={(v) => `${v} ms`}
        display={`${value.onsetShiftMs} ms`}
        value={value.onsetShiftMs}
        min={0}
        max={150}
        step={5}
        onChange={(next) => set({ onsetShiftMs: next })}
        hint="Zieht alle Noten nach vorn. Höher, wenn die Balken dem Gesang hinterherhinken."
      />

      <SettingSlider
        label="Balken verschmelzen bis"
        commitOnly
        format={(v) => `${v} ms Lücke`}
        display={`${value.mergeGapMs} ms Lücke`}
        value={value.mergeGapMs}
        min={0}
        max={200}
        step={10}
        onChange={(next) => set({ mergeGapMs: next })}
        hint="Balken, die dichter aneinanderstoßen, werden zu einem — sofern die Tonhöhe passt."
      />

      <SettingSlider
        label="Verschmelz-Toleranz"
        commitOnly
        format={(v) => `${v.toFixed(2)} Halbtöne`}
        display={`${value.mergeToleranceSemitones.toFixed(2)} Halbtöne`}
        value={value.mergeToleranceSemitones}
        min={0}
        max={2}
        step={0.1}
        onChange={(next) => set({ mergeToleranceSemitones: next })}
      />

      <SettingSlider
        label="Phrasenpause"
        commitOnly
        format={(v) => `${v} ms`}
        display={`${value.phraseGapMs} ms`}
        value={value.phraseGapMs}
        min={200}
        max={2000}
        step={50}
        onChange={(next) => set({ phraseGapMs: next })}
        hint="Ab dieser Pause beginnt eine neue Zeile."
      />
    </section>
  );
};
