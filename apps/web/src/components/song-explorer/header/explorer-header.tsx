"use client";

import { SettingsDialog } from "@/components/settings/settings-dialog";

export const ExplorerHeader = () => {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4 md:px-6">
      <h1 className="shrink-0 font-semibold tracking-tight">VocalWonder</h1>

      <div className="flex min-w-0 items-center gap-2">
        <SettingsDialog />
      </div>
    </header>
  );
};
