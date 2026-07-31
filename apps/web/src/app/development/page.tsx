import { SeparationSpike } from "@/components/development/separation-spike";

/** Nicht verlinkte Werkbank für Messversuche. Fliegt raus, wenn die Fragen beantwortet sind. */
export default function DevelopmentPage() {
  // Der Body ist global auf Fensterhöhe ohne Scroll festgenagelt (die App soll sich wie eine
  // Desktop-Anwendung anfühlen). Diese Seite ist eine Ausnahme und scrollt in sich selbst.
  return (
    <div className="h-dvh overflow-y-auto">
      <SeparationSpike />
    </div>
  );
}
