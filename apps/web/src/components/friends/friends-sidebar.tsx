"use client";

import { FriendsList } from "@/components/friends/friends-list";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";

/**
 * Das Freunde-Feld rechts. Unsichtbar, bis es über den Knopf in der Kopfzeile geholt wird.
 *
 * Später zieht hier mehr ein — Herausforderungen, Nachrichten. Die Zeilen der Liste sind
 * bereits so gebaut, dass ein weiterer Knopf je Person dazupasst.
 */
export const FriendsSidebar = () => {
  const { toggleSidebar, setOpen, open, isMobile } = useSidebar();

  return (
    <>
      {/* Klick daneben schließt. Unsichtbar, aber es fängt den Klick ab — der erste Klick
          schließt also nur, statt nebenbei einen Song auszuwählen. Auf Mobilgeräten bringt
          das eingeschobene Fenster seinen eigenen Hintergrund mit. */}
      {open && !isMobile && (
        <div className="fixed inset-0 z-10" aria-hidden onClick={() => setOpen(false)} />
      )}
      {/* Volle Fensterhöhe, also auch über der Kopfzeile: Das Feld ist beim Öffnen die
          Hauptsache, und der Weg zurück steht mit dem Kreuz in seinem eigenen Kopf. */}
      <Sidebar side="right" collapsible="offcanvas">
        <SidebarContent>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <h2 className="text-sm font-medium">Freunde</h2>

            <Button variant="ghost" size="icon-sm" aria-label="Schließen" onClick={toggleSidebar}>
              <CloseIcon />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <FriendsList />
          </div>
        </SidebarContent>
      </Sidebar>
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
