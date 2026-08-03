"use client";

import { DemoSongs } from "@/components/song-explorer/explorer/demo-songs";
import { useSession } from "@/lib/auth/auth-client";
import { FolderPicker } from "../header/folder-picker";

/**
 * Platzhalter, solange kein Songordner freigegeben ist — hält das Layout in Form.
 *
 * Für alle ohne eigene Dateien stehen hier Beispielsongs. Nur ohne Anmeldung: Wer ein Konto
 * hat, bringt seine eigene Musik mit; dort wären sie nur im Weg.
 */
export const EmptyExplorer = () => {
  const { data: session, isPending } = useSession();

  return (
    <div className="flex h-full flex-col items-center justify-center space-y-4 p-6 text-center text-sm text-muted-foreground">
      <div className="flex flex-col items-center space-y-2">
        <p>Noch kein Songordner freigegeben.</p>
        <FolderPicker />
      </div>

      {!session && !isPending && (
        <div className="flex w-full flex-col items-center space-y-2 border-t border-border pt-4">
          <p>Oder erst mal so ausprobieren:</p>
          <DemoSongs />
        </div>
      )}
    </div>
  );
};
