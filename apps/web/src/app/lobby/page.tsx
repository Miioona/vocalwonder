"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useLobbyStore } from "@/stores/useLobbyStore";

/** `/lobby` ohne Code: weiter in die laufende Lobby, sonst zurück zur Startseite. */
export default function LobbyIndexPage() {
  const lobby = useLobbyStore((state) => state.lobby);
  const known = useLobbyStore((state) => state.known);
  const router = useRouter();

  useEffect(() => {
    if (lobby) router.replace(`/lobby/${lobby.code}`);
    else if (known) router.replace("/");
  }, [lobby, known, router]);

  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
      verbindet …
    </div>
  );
}
