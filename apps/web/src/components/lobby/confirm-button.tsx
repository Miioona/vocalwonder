"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Ein Knopf, der zweimal geklickt werden will.
 *
 * Für Sachen, die man nicht versehentlich tun soll — jemanden aus der Lobby werfen etwa.
 * Ein eigener Dialog wäre für ein Kreuz in einer Zeile zu viel; der Knopf beschriftet sich
 * beim ersten Klick um und fällt nach ein paar Sekunden von selbst zurück, falls der Klick
 * ein Versehen war.
 */
export const ConfirmButton = ({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;

    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <Button size="icon-sm" variant="ghost" aria-label={label} onClick={() => setArmed(true)}>
        ✕
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => {
        setArmed(false);
        onConfirm();
      }}
    >
      {confirmLabel}
    </Button>
  );
};
