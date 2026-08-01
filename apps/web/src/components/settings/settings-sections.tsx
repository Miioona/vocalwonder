"use client";

import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

/** Ein Abschnitt im Einstellungsdialog — Überschrift plus Inhalt. */
export const SettingsSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 border-t border-border pt-5 first:border-0 first:pt-0">
    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
    {children}
  </section>
);

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
}: SettingSliderProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-4">
      <Label>{label}</Label>
      <span className="font-mono text-sm text-muted-foreground">{display}</span>
    </div>

    <Slider
      min={min}
      max={max}
      step={step}
      value={[value]}
      disabled={disabled}
      onValueChange={(next) => onChange(Array.isArray(next) ? (next[0] ?? value) : next)}
    />

    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);
