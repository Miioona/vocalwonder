"use client";

import { useEffect, useRef, useState } from "react";

import { LOBBY_MESSAGE_MAX } from "@vocalwonder/core";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lobbyCommands } from "@/lib/realtime/socket";
import { useLobbyStore } from "@/stores/useLobbyStore";
import { cn } from "@/lib/utils";

/**
 * Der Chat der Lobby.
 *
 * Absender und Zeit setzt der Server — was hier ankommt, ist bereits geprüft. Der Verlauf
 * kommt beim Betreten mit, damit man nicht mitten in ein Gespräch stolpert.
 */
export const LobbyChat = ({ className }: { className?: string }) => {
  const messages = useLobbyStore((state) => state.messages);
  const clearUnread = useLobbyStore((state) => state.clearUnread);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Immer das Neueste im Blick — wie in jedem Chat.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    clearUnread();
  }, [messages, clearUnread]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setText("");
    await lobbyCommands.send(trimmed);
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Noch nichts geschrieben.</p>
        ) : (
          <ul className="flex flex-col gap-2 py-1">
            {messages.map((message) =>
              message.kind === "system" ? (
                <li key={message.id} className="text-xs text-muted-foreground italic">
                  {message.text}
                </li>
              ) : (
                <li key={message.id} className="text-sm">
                  <span className="mr-2 font-medium">{message.player?.playerName}</span>
                  <span className="text-xs text-muted-foreground">{time(message.at)}</span>
                  <p className="break-words text-foreground/90">{message.text}</p>
                </li>
              ),
            )}
          </ul>
        )}

        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={LOBBY_MESSAGE_MAX}
          placeholder="Nachricht"
          autoComplete="off"
        />
        <Button type="submit" disabled={!text.trim()}>
          Senden
        </Button>
      </form>
    </div>
  );
};

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
