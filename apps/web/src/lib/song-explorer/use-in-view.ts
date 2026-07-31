"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Meldet, sobald das Element zum ersten Mal im Sichtbereich war, und hört dann auf zu
 * beobachten. Für die Songliste reicht das: Was einmal gelesen wurde, bleibt im Cache.
 *
 * Der Vorlauf von 300px sorgt dafür, dass Zeilen beim Scrollen schon fertig sind, bevor
 * man sie sieht.
 */
export const useInView = <T extends Element>() => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { rootMargin: "300px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [inView]);

  return { ref, inView };
};
