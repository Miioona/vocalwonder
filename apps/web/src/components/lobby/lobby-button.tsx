"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLobbyStore } from "@/stores/useLobbyStore";
import { cn } from "@/lib/utils";

/**
 * Der Weg zurück in die Lobby, von überall.
 *
 * Wer gerade in der Bibliothek Songs aussucht, soll nicht suchen müssen, wie er zu den
 * anderen zurückkommt. Sichtbar nur, solange man tatsächlich in einer Lobby sitzt — und
 * nicht, wenn man ohnehin schon dort ist.
 */
export const LobbyButton = () => {
  const lobby = useLobbyStore((state) => state.lobby);
  const pathname = usePathname();

  if (!lobby || pathname.startsWith("/lobby")) return null;

  return (
    <Link
      href={`/lobby/${lobby.code}`}
      className={cn(
        "flex items-center gap-2 rounded-md bg-primary/15 px-3 py-1.5 text-sm whitespace-nowrap",
        "text-foreground transition-colors hover:bg-primary/25",
      )}
    >
      <span className="size-1.5 rounded-full bg-primary" />
      Lobby
      <span className="text-xs text-muted-foreground">{lobby.players.length}</span>
    </Link>
  );
};
