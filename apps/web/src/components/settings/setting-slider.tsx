"use client";

import { useState, type ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SettingSliderProps {
  label: string;
  /** Rechts neben der Beschriftung, z. B. "40 %" oder "120 ms". */
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  hint?: ReactNode;
  onChange: (value: number) => void;
  /**
   * Meldet den Wert erst beim Loslassen statt bei jeder Bewegung. Für Regler, hinter denen
   * eine teure Rechnung hängt — sonst hakt das Ziehen.
   */
  commitOnly?: boolean;
  /** Nötig im `commitOnly`-Modus, damit die Anzeige beim Ziehen mitläuft. */
  format?: (value: number) => string;
}

/**
 * Regler mit Beschriftung, Wert und Erklärung. Base UI liefert `onValueChange` je nach
 * Eingabe als Zahl oder als Liste — das wird hier einmal zentral entwirrt.
 */
export const SettingSlider = ({
  label,
  display,
  value,
  min,
  max,
  step,
  disabled,
  hint,
  onChange,
  commitOnly = false,
  format,
}: SettingSliderProps) => {
  // Eigener Wert fürs Ziehen. Ändert sich der Wert von außen, wird er übernommen —
  // Zustandsanpassung während des Renders, damit kein zusätzlicher Durchlauf entsteht.
  const [dragged, setDragged] = useState(value);
  const [previous, setPrevious] = useState(value);
  if (previous !== value) {
    setPrevious(value);
    setDragged(value);
  }

  const shown = commitOnly ? dragged : value;
  const single = (next: number | readonly number[]): number =>
    Array.isArray(next) ? (next[0] ?? value) : (next as number);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label>{label}</Label>
        <span className="font-mono text-sm text-muted-foreground">
          {format ? format(shown) : display}
        </span>
      </div>

      <Slider
        min={min}
        max={max}
        step={step}
        value={[shown]}
        disabled={disabled}
        onValueChange={(next) => {
          const value = single(next);
          if (commitOnly) setDragged(value);
          else onChange(value);
        }}
        onValueCommitted={(next) => {
          if (commitOnly) onChange(single(next));
        }}
      />

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};
