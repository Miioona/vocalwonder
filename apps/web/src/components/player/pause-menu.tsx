"use client";

import { Button } from "@/components/ui/button";

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  /** Am Ende des Songs gibt es nichts fortzusetzen. */
  canResume: boolean;
}

export const PauseMenu = ({ onResume, onRestart, onExit, canResume }: PauseMenuProps) => {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex w-64 flex-col gap-2 rounded-xl border border-border bg-popover/95 p-4">
        {canResume && (
          <Button variant="outline" onClick={onResume} className="w-full">
            Weiter
          </Button>
        )}
        <Button variant="outline" onClick={onRestart} className="w-full">
          Von vorn
        </Button>
        <Button variant="outline" onClick={onExit} className="w-full">
          Beenden
        </Button>
        <p className="mt-1 text-center text-xs text-muted-foreground">Esc schließt das Menü</p>
      </div>
    </div>
  );
};
