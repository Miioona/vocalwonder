"use client";

import { Button } from "@/components/ui/button";
import { useExplorerStore } from "@/stores/useExplorerStore";

/** Kompakte Leiste für die Kopfzeile — der Ordner ist Werkzeug, nicht Inhalt. */
export const FolderPicker = () => {
  const status = useExplorerStore((state) => state.status);
  const root = useExplorerStore((state) => state.root);
  const error = useExplorerStore((state) => state.error);
  const pick = useExplorerStore((state) => state.pick);
  const grantPermission = useExplorerStore((state) => state.grantPermission);
  const forget = useExplorerStore((state) => state.forget);

  return (
    <div className="flex min-w-0 items-center gap-2">
      {error && <span className="hidden truncate text-xs text-red-400 sm:block">{error}</span>}

      {status === "loading" && <span className="text-xs text-neutral-600">lade …</span>}

      {status === "unsupported" && (
        <span className="text-xs text-amber-400">Ordnerzugriff nur in Chrome und Edge</span>
      )}

      {status === "empty" && <Button onClick={() => void pick()}>Ordner auswählen</Button>}

      {status === "needs-permission" && (
        <>
          <span className="hidden truncate text-xs text-neutral-500 sm:block">{root?.name}</span>
          <Button onClick={() => void grantPermission()}>Zugriff erlauben</Button>
        </>
      )}

      {status === "ready" && (
        <>
          <span className="hidden truncate font-mono text-xs text-neutral-500 sm:block">
            {root?.name}
          </span>
          <Button onClick={() => void pick()}>Wechseln</Button>
          <Button onClick={() => void forget()} className="hidden sm:block">
            Vergessen
          </Button>
        </>
      )}
    </div>
  );
};
