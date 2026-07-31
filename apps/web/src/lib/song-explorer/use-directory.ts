"use client";

import { useEffect, useState } from "react";

import { readDirectory } from "./read-directory";
import type { DirectoryContents } from "./types";

const EMPTY: DirectoryContents = { folders: [], files: [], skipped: [] };

/** Liest den Inhalt eines Ordners. Ohne Handle passiert nichts. */
export function useDirectory(handle: FileSystemDirectoryHandle | undefined, path: string) {
  const [contents, setContents] = useState<DirectoryContents>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!handle) return;

    const controller = new AbortController();

    void (async () => {
      setStatus("loading");
      setError(undefined);
      try {
        const result = await readDirectory(handle, path, controller.signal);
        if (controller.signal.aborted) return;
        setContents(result);
        setStatus("done");
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [handle, path]);

  return { contents, status, error };
}
