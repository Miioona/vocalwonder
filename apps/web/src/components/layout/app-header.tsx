"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FriendsButton } from "@/components/friends/friends-button";
import { AREAS, lockReason } from "@/components/layout/areas";
import { UserMenu } from "@/components/layout/user-menu";
import { useSession } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";

/**
 * Gemeinsame Kopfzeile über allen Seiten.
 *
 * Ab Tablet-Breite abwärts wandern Logo und Bereiche in das Menüfeld von links; in der
 * Kopfzeile bleiben dann nur das Burger-Symbol und rechts Nutzer und Freunde — die beiden
 * sollen immer erreichbar sein.
 */
export const AppHeader = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    // Drei Spalten statt Fluss: Nur so steht das Menü wirklich mittig und wandert nicht,
    // wenn links oder rechts etwas dazukommt.
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 md:px-6">
      {/* Feste Spalten: Ein ausgeblendetes Menü fällt aus dem Raster, sonst rutscht die
          rechte Gruppe in die Mitte nach. */}
      <div className="col-start-1 flex items-center">
        <button
          type="button"
          aria-label="Menü"
          onClick={onOpenMenu}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
        >
          <BurgerIcon />
        </button>

        <Link
          href="/"
          className="hidden w-fit shrink-0 font-semibold tracking-tight transition-opacity hover:opacity-80 lg:block"
        >
          VocalWonder
        </Link>
      </div>

      <nav className="col-start-2 hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex">
        {AREAS.map((area) => {
          const locked = lockReason(area, Boolean(session));

          if (locked) {
            return (
              <span
                key={area.href}
                title={locked}
                className="flex cursor-default items-center gap-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground/50"
              >
                {area.label}
                <LockIcon />
              </span>
            );
          }

          return (
            <Link
              key={area.href}
              href={area.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                pathname.startsWith(area.href)
                  ? "bg-primary/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {area.label}
            </Link>
          );
        })}
      </nav>

      <div className="col-start-3 flex items-center justify-end gap-1">
        <UserMenu />
        <FriendsButton />
      </div>
    </header>
  );
};

const BurgerIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-5"
    aria-hidden
  >
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-3"
    aria-hidden
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
