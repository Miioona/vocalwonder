"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { useSession } from "@/lib/auth/auth-client";
import { useFriends } from "@/lib/friends/use-friends";
import { useRealtimeStore } from "@/stores/useRealtimeStore";
import { cn } from "@/lib/utils";

/**
 * Der Weg zu den Freunden — ein Symbol in der Kopfzeile.
 *
 * Die Zahl darauf ist als Sammelstelle gedacht: heute offene Anfragen, später auch
 * Herausforderungen und Nachrichten. Deshalb steht sie am Symbol und nicht in der Liste —
 * man soll sie sehen, ohne das Feld zu öffnen.
 */
export const FriendsButton = () => {
  const { toggleSidebar, open } = useSidebar();
  const { data: session } = useSession();
  const { data: list } = useFriends();

  const waiting = list?.incoming.length ?? 0;

  // Wie viele Freunde gerade da sind — aus der offenen Verbindung.
  const friendIds = list?.friends.map((friend) => friend.userId) ?? [];
  const onlineCount = useRealtimeStore(
    (state) => state.online.filter((entry) => friendIds.includes(entry.userId)).length,
  );

  return (
    <button
      type="button"
      aria-label="Freunde"
      onClick={toggleSidebar}
      className={cn(
        "relative rounded-md p-2 transition-colors",
        open ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-muted",
        // Ohne Konto gibt es keine Freunde — sichtbar bleibt der Knopf trotzdem, im Feld
        // steht dann, woran es hängt.
        !session && "opacity-50",
      )}
    >
      <span className="flex items-center gap-1.5">
        <FriendsIcon />

        {/* Wer da ist, steht neben dem Symbol — die Zahl oben rechts bleibt dem vorbehalten,
            was auf eine Antwort wartet. */}
        {onlineCount > 0 && (
          <span className="flex items-center gap-1 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {onlineCount}
          </span>
        )}
      </span>

      {waiting > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {waiting > 9 ? "9+" : waiting}
        </span>
      )}
    </button>
  );
};

const FriendsIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-5"
    aria-hidden
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
