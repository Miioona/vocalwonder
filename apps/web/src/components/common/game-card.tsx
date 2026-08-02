import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GameCardProps {
  title?: string;
  /**
   * Zweiter Rahmen außen herum, mit durchsichtigem Zwischenraum.
   *
   * Der Zwischenraum zeigt den Hintergrund der Seite — deshalb wirkt die Karte nur dort, wo
   * hinter ihr etwas passiert. Auf einer glatten Fläche sähe der äußere Rahmen aus wie ein
   * versehentlich doppelter Rand.
   */
  framed?: boolean;
  className?: string;
  children: ReactNode;
}

/** Die Karte des Hauptmenüs: Überschrift oben, Inhalt darunter. */
export const GameCard = ({ title, framed = false, className, children }: GameCardProps) => {
  const card = (
    <section
      className={cn(
        // Schatten nur im Hellen: Im Dunkeln trennt der Helligkeitsunterschied von selbst,
        // dort würde er nur schmutzig aussehen.
        "flex min-h-40 flex-1 flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm dark:shadow-none",
        className,
      )}
    >
      {title && (
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  );

  if (!framed) return card;

  return (
    // `p-1.5` ist der Zwischenraum, `border-border/70` der äußere Rahmen — etwas leichter als
    // der innere, damit er die Karte umfasst, statt mit ihrem eigenen Rand zu konkurrieren.
    <div className="flex flex-col rounded-2xl border border-border/70 p-1.5">{card}</div>
  );
};
