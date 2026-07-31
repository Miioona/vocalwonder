"use client";

import { FolderPicker } from "@/components/song-explorer/header/folder-picker";

export const ExplorerHeader = () => {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-neutral-800 px-4 md:px-6">
      <h1 className="shrink-0 font-semibold tracking-tight">VocalWonder</h1>
      <FolderPicker />
    </header>
  );
};
