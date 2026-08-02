"use client";

import { useEffect } from "react";

import { useExplorerStore } from "@/stores/useExplorerStore";

/**
 * Holt den zuletzt freigegebenen Ordner zurück, einmal beim Start der App.
 *
 * Saß früher im Explorer. Seit die Startseite die Bibliothek ebenfalls anzeigt, gehört es
 * eine Ebene höher — sonst wüsste `/` nichts von den Songs, solange man nicht einmal in der
 * Bibliothek war.
 */
export const LibraryBoot = () => {
  const restore = useExplorerStore((state) => state.restore);

  // Erst nach dem Mount möglich: Auf dem Server gibt es weder window noch IndexedDB.
  useEffect(() => {
    void restore();
  }, [restore]);

  return null;
};
