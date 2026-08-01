"use client";

import { useState } from "react";

import { AccountSettings } from "@/components/settings/sections/account-settings";
import { AudioSettings } from "@/components/settings/sections/audio-settings";
import { LibrarySettings } from "@/components/settings/sections/library-settings";
import { ThemeSettings } from "@/components/settings/sections/theme-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Einstellungen, erreichbar über das Zahnrad in der Kopfzeile. Bereiche links, Inhalt rechts. */
const SECTIONS = [
  { id: "audio", label: "Audio" },
  { id: "theme", label: "Darstellung" },
  { id: "library", label: "Bibliothek" },
  { id: "account", label: "Konto" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export const SettingsDialog = () => {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SectionId>("audio");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Einstellungen">
            <GearIcon />
          </Button>
        }
      />

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
            {section === "library" && <LibrarySettings onFolderChange={() => setOpen(false)} />}
            {section === "account" && <AccountSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.6.77 1 1.41 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
