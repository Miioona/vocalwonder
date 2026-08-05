"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GameCard } from "@/components/common/game-card";
import { LobbyChat } from "@/components/lobby/lobby-chat";
import { Button } from "@/components/ui/button";
import { lobbyCommands } from "@/lib/realtime/socket";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { cn } from "@/lib/utils";

/**
 * Die Lobby: wer ist da, wer wurde eingeladen, und der Weg hinaus.
 *
 * Der Stand kommt vollständig vom Server. Fällt die Lobby weg — alle gegangen, Verbindung
 * verloren — landet man wieder auf der Startseite, statt auf einen leeren Raum zu starren.
 */
export const LobbyScreen = ({ code }: { code: string }) => {
  const lobby = useLobbyStore((state) => state.lobby);
  const known = useLobbyStore((state) => state.known);
  const unread = useLobbyStore((state) => state.unread);
  const [tab, setTab] = useState<"runde" | "chat">("runde");
  const router = useRouter();

  const belongsHere = lobby?.code === code;

  useEffect(() => {
    // Erst wenn der Server geantwortet hat, ist "keine Lobby" eine Aussage. Bloß verbunden zu
    // sein reicht nicht — der Stand kommt einen Moment später als die Verbindung.
    if (known && !belongsHere) router.replace("/");
  }, [known, belongsHere, router]);

  if (!lobby || !belongsHere) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {known ? "Diese Lobby gibt es nicht mehr." : "verbindet …"}
      </div>
    );
  }

  const leave = async () => {
    await lobbyCommands.leave();
    router.push("/");
  };

  const players = (
    <>
      <GameCard framed title="Dabei">
        {lobby.players.map((player) => (
          <div key={player.userId} className="flex items-center gap-3 py-1">
            <Avatar image={player.image} name={player.playerName} />
            <span className="min-w-0 flex-1 truncate text-sm">{player.playerName}</span>
            {player.userId === lobby.hostId && (
              <span className="text-xs text-muted-foreground">Gastgeber</span>
            )}
          </div>
        ))}
      </GameCard>

      {lobby.invited.length > 0 && (
        <GameCard framed title="Eingeladen">
          {lobby.invited.map((player) => (
            <div key={player.userId} className="flex items-center gap-3 py-1 opacity-60">
              <Avatar image={player.image} name={player.playerName} />
              <span className="min-w-0 flex-1 truncate text-sm">{player.playerName}</span>
              <span className="text-xs text-muted-foreground">wartet</span>
            </div>
          ))}
        </GameCard>
      )}

      <p className="text-xs text-muted-foreground">
        Songwahl und gemeinsames Singen kommen als Nächstes.
      </p>
    </>
  );

  return (
    <div className="game-backdrop flex h-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between gap-4 p-4 md:p-6">
        <div>
          <h1 className="text-lg font-semibold">Lobby</h1>
          <p className="font-mono text-sm tracking-widest text-muted-foreground">{lobby.code}</p>
        </div>

        <Button variant="outline" onClick={() => void leave()}>
          Verlassen
        </Button>
      </div>

      {/* Auf schmalen Schirmen wird umgeschaltet statt gestapelt: Ein Chat, den man erst
          herunterscrollen muss, ist keiner. Der Punkt am Reiter zeigt, dass etwas kam. */}
      <div className="mx-auto flex w-full max-w-5xl shrink-0 gap-1 px-4 md:px-6 lg:hidden">
        {(["runde", "chat"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
              tab === value
                ? "bg-primary/15 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {value === "runde" ? "Runde" : "Chat"}
            {value === "chat" && unread > 0 && tab !== "chat" && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-5xl min-h-0 flex-1 gap-4 p-4 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div
          className={cn("flex flex-col gap-4 overflow-y-auto", tab === "chat" && "max-lg:hidden")}
        >
          {players}
        </div>

        <GameCard framed title="Chat" className={cn("min-h-0", tab === "runde" && "max-lg:hidden")}>
          <LobbyChat className="flex-1" />
        </GameCard>
      </div>
    </div>
  );
};

const Avatar = ({ image, name }: { image?: string; name: string }) =>
  image ? (
    // Kein next/image: Die Bilder liegen bei Google und Discord.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
