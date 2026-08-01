"use client";

import { Button } from "@/components/ui/button";
import { useExplorerStore } from "@/stores/useExplorerStore";

export const LibrarySettings = ({ onFolderChange }: { onFolderChange: () => void }) => {
  const status = useExplorerStore((state) => state.status);
  const root = useExplorerStore((state) => state.root);
  const pick = useExplorerStore((state) => state.pick);
  const forget = useExplorerStore((state) => state.forget);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Freigegebener Ordner</p>
        <p className="truncate font-mono text-sm">{root?.name ?? "keiner"}</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            // Der Dialog schließt sich: Der Ordner-Dialog des Browsers legt sich sonst über
            // unseren, und dahinter steht die alte Liste.
            onFolderChange();
            void pick();
          }}
        >
          {root ? "Ordner wechseln" : "Ordner auswählen"}
        </Button>

        {status === "ready" && (
          <Button
            variant="ghost"
            onClick={() => {
              onFolderChange();
              void forget();
            }}
          >
            Vergessen
          </Button>
        )}
      </div>
    </div>
  );
};
