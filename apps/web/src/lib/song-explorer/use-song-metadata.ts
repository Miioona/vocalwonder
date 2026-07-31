"use client";

import { useEffect, useState } from "react";

import { getCachedMetadata, loadMetadata } from "./metadata-cache";
import type { AudioFile, SongMetadata } from "./types";

type MetadataStatus = "idle" | "loading" | "done" | "error";

interface UseSongMetadataOptions {
  /** Erst lesen, wenn die Zeile sichtbar ist. */
  enabled?: boolean;
  /** Dauer notfalls durch Scannen ermitteln — nur für die Preview. */
  precise?: boolean;
}

/**
 * Tags eines Songs. Die Cover-URL gehört dem Cache und wird hier bewusst **nicht**
 * freigegeben — sonst zeigt eine zweite Komponente auf ein totes Bild.
 */
export const useSongMetadata = (file?: AudioFile, options: UseSongMetadataOptions = {}) => {
  const { enabled = true, precise = false } = options;

  const [metadata, setMetadata] = useState<SongMetadata | undefined>(() =>
    file ? getCachedMetadata(file.path) : undefined,
  );
  const [status, setStatus] = useState<MetadataStatus>(() =>
    file && getCachedMetadata(file.path) ? "done" : "idle",
  );
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file || !enabled) return;

    let cancelled = false;

    void (async () => {
      // Cache-Treffer nicht als Ladevorgang anzeigen, sonst blitzt der Platzhalter auf.
      if (!getCachedMetadata(file.path)) setStatus("loading");
      setError(undefined);

      try {
        const result = await loadMetadata(file, { precise });
        if (cancelled) return;
        setMetadata(result);
        setStatus("done");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Tags nicht lesbar.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, enabled, precise]);

  return { metadata, status, error };
};
