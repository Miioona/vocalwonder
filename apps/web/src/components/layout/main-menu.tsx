"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AREAS, lockReason } from "@/components/layout/areas";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";

/**
 * Das Menü als Feld von links — auf Tablets und Telefonen, wo die Bereiche nicht mehr
 * nebeneinander in die Kopfzeile passen.
 *
 * Eigenes Feld statt einer zweiten shadcn-Sidebar: Die hält genau einen Zustand, und ein
 * zweiter Anbieter würde der Kopfzeile den Zugriff auf das Freunde-Feld verdecken.
 */
export const MainMenu = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <>
      {/* Klick daneben schließt — wie beim Freunde-Feld. */}
      {open && <div className="fixed inset-0 z-30 lg:hidden" aria-hidden onClick={onClose} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-border bg-sidebar transition-transform duration-200 ease-linear lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        // Zu heißt: für Tastatur und Vorlesehilfen nicht vorhanden.
        aria-hidden={!open}
        inert={!open}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/" onClick={onClose} className="font-semibold tracking-tight">
            VocalWonder
          </Link>

          <Button variant="ghost" size="icon-sm" aria-label="Menü schließen" onClick={onClose}>
            <CloseIcon />
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {AREAS.map((area) => {
            const locked = lockReason(area, Boolean(session));

            if (locked) {
              return (
                <span
                  key={area.href}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/50"
                >
                  {area.label}
                  <span className="text-xs">{locked}</span>
                </span>
              );
            }

            return (
              <Link
                key={area.href}
                href={area.href}
                onClick={onClose}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
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
      </aside>
    </>
  );
};

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="size-4"
    aria-hidden
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
