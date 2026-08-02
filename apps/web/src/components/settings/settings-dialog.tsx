"use client";

import { useState } from "react";

import { AccountSettings } from "@/components/settings/sections/account-settings";
import { AudioSettings } from "@/components/settings/sections/audio-settings";
import { LibrarySettings } from "@/components/settings/sections/library-settings";
import { ThemeSettings } from "@/components/settings/sections/theme-settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Einstellungen, aufgerufen aus dem Nutzermenü. Bereiche links, Inhalt rechts. */
const SECTIONS = [
  { id: "audio", label: "Audio" },
  { id: "theme", label: "Darstellung" },
  { id: "library", label: "Bibliothek" },
  { id: "account", label: "Konto" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Wird von außen gesteuert: Aufgerufen wird er aus dem Nutzermenü in der Kopfzeile. */
export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [section, setSection] = useState<SectionId>("audio");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Ohne eigenes Innenmaß: Kopf, Menü und Inhalt setzen ihres selbst, damit die
          Trennlinien bis an den Rand laufen. */}
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Einstellungen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row">
          {/* Auf schmalen Schirmen liegen die Bereiche als Reihe oben statt als Spalte. */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-sidebar p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:p-3">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-sm whitespace-nowrap transition-colors",
                  section === id
                    ? "bg-primary/15 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Feste Höhe: Die Bereiche sind unterschiedlich lang, sonst springt der Dialog
              bei jedem Wechsel. */}
          <div className="h-[min(60dvh,26rem)] min-w-0 flex-1 overflow-y-auto p-5">
            {section === "audio" && <AudioSettings />}
            {section === "theme" && <ThemeSettings />}
            {section === "library" && (
              <LibrarySettings onFolderChange={() => onOpenChange(false)} />
            )}
            {section === "account" && <AccountSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
