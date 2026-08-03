import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Ob das Fenster schmal ist. Aus der shadcn-Vorlage, aber auf `useSyncExternalStore`
 * umgestellt: Die Vorlage setzt den Zustand im Effekt, was einen Durchgang mit falschem Wert
 * bedeutet — und was die React-Regeln zu Recht anmerken.
 *
 * Auf dem Server gibt es kein `matchMedia`; dort gilt "nicht schmal", passend zur
 * Voreinstellung des Layouts.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
