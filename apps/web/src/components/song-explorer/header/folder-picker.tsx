"use client";

import { Button } from "@/components/ui/button";
import { useExplorerStore } from "@/stores/useExplorerStore";

/**
 * Kompakte Anzeige in der Kopfzeile: welcher Ordner offen ist, und was gerade zu tun ist.
 *
 * Wechseln und Vergessen sind in die Einstellungen gewandert — beides braucht man selten,
 * und die Kopfzeile soll nicht nach Werkzeugkasten aussehen. Auswählen und Zugriff erneuern
 * bleiben hier, weil ohne sie nichts geht und man sie nicht suchen soll.
 */
export const FolderPicker = () => {
  const status = useExplorerStore((state) => state.status);
  const root = useExplorerStore((state) => state.root);
  const error = useExplorerStore((state) => state.error);
  const pick = useExplorerStore((state) => state.pick);
  const grantPermission = useExplorerStore((state) => state.grantPermission);

  return (
    <div className="flex min-w-0 items-center gap-2">
      {error && <span className="hidden truncate text-xs text-destructive sm:block">{error}</span>}

      {status === "loading" && <span className="text-xs text-muted-foreground">lade …</span>}

      {status === "unsupported" && (
        <span className="text-xs text-amber-500 dark:text-amber-400">
          Ordnerzugriff nur in Chrome und Edge
        </span>
      )}

      {status === "empty" && <Button onClick={() => void pick()}>Ordner auswählen</Button>}

      {status === "needs-permission" && (
        <>
          <span className="hidden truncate text-xs sm:block">{root?.name}</span>
          <Button variant="outline" onClick={() => void grantPermission()}>
            Zugriff erlauben
          </Button>
        </>
      )}

      {status === "ready" && (
        <span className="hidden truncate font-mono text-xs text-muted-foreground sm:block">
          {root?.name}
        </span>
      )}
    </div>
  );
};
