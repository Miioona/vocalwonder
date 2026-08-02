"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { FriendsSidebar } from "@/components/friends/friends-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MainMenu } from "@/components/layout/main-menu";
import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * Das Gerüst um jede Seite: Kopfzeile oben, Inhalt darunter, Freunde rechts, Menü links.
 *
 * Die Kopfzeile liegt **innerhalb** des Sidebar-Kontexts, weil der Knopf dort das Feld öffnet.
 * Auf Mobilgeräten ist das Feld ein eingeschobenes Fenster mit eigenem Zustand — ohne den
 * gemeinsamen Kontext bekäme der Knopf es dort nicht auf.
 *
 * Zu ist die Voreinstellung: Beide Felder erscheinen erst, wenn jemand sie holt.
 */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SidebarProvider
      defaultOpen={false}
      className="app-shell min-h-0"
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
    >
      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader onOpenMenu={() => setMenuOpen(true)} />

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>

      <MainMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <FriendsSidebar />
    </SidebarProvider>
  );
};
