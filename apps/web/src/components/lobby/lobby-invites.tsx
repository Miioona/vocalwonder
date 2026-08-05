"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { lobbyCommands } from "@/lib/realtime/socket";
import { useLobbyStore } from "@/stores/useLobbyStore";

/**
 * Eingegangene Einladungen — als Karte unten rechts, über allem.
 *
 * Kein Einblender, der von selbst verschwindet: Eine Einladung will beantwortet werden, und
 * wer gerade woanders hinsieht, hätte sie sonst verpasst. Sie geht erst weg, wenn man
 * antwortet oder der Einladende sie zurückzieht.
 */
export const LobbyInvites = () => {
  const invites = useLobbyStore((state) => state.invites);
  const removeInvite = useLobbyStore((state) => state.removeInvite);
  const router = useRouter();

  if (invites.length === 0) return null;

  const accept = async (code: string) => {
    const result = await lobbyCommands.accept(code);
    removeInvite(code);

    if (!result.ok) {
      toast(result.message ?? "Beitritt nicht möglich");
      return;
    }

    router.push(`/lobby/${code}`);
  };

  const decline = async (code: string) => {
    removeInvite(code);
    await lobbyCommands.decline(code);
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-2">
      {invites.map((invite) => (
        <div
          key={invite.code}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg"
        >
          <p className="text-sm">
            <span className="font-medium">{invite.from.playerName}</span> lädt dich ein
          </p>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => void accept(invite.code)}>
              Beitreten
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void decline(invite.code)}>
              Ablehnen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
