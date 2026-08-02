"use client";

import { useEffect, useState } from "react";

/**
 * Gibt den Wert erst weiter, wenn eine Weile nichts mehr getippt wurde.
 *
 * Für Suchfelder: Sonst geht pro Zeichen eine Anfrage raus, und die Antworten treffen in
 * beliebiger Reihenfolge ein.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
