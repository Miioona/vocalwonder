"use client";

import { useEffect, useState } from "react";

import { FileList } from "@/components/song-explorer/explorer/file-list";
import { FolderTree } from "@/components/song-explorer/explorer/folder-tree";
import { formatSkipped } from "@/lib/song-explorer/audio-files";
import type { DirectoryContents, SubFolder } from "@/lib/song-explorer/types";
import { useDirectory } from "@/lib/song-explorer/use-directory";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/stores/useExplorerStore";

/** "2 Ordner · 120 Songs · 4 andere" — zeigt auch, was der Filter aussortiert hat. */
function summarize({ folders, files, skipped }: DirectoryContents): string {
  const others = skipped.reduce((sum, entry) => sum + entry.count, 0);
  const parts = [`${folders.length} Ordner`, `${files.length} Songs`];
  if (others > 0) parts.push(`${others} andere`);
  return parts.join(" · ");
}

function skippedDetail({ skipped }: DirectoryContents): string | undefined {
  if (skipped.length === 0) return undefined;
  return skipped.map(formatSkipped).join(", ");
}

export const Explorer = () => {
  const root = useExplorerStore((state) => state.root);
  const folder = useExplorerStore((state) => state.folder);
  const selectedFile = useExplorerStore((state) => state.selectedFile);
  const openFolder = useExplorerStore((state) => state.openFolder);
  const selectFile = useExplorerStore((state) => state.selectFile);

  /** Auf schmalen Schirmen ist immer nur eine der beiden Spalten sichtbar. */
  const [mobilePane, setMobilePane] = useState<"folders" | "files">("folders");

  const setFiles = useExplorerStore((state) => state.setFiles);

  const { contents, status, error } = useDirectory(folder?.handle, folder?.path ?? "");

  // Der Spielmodus braucht die Liste, um danach den nächsten Titel vorzuschlagen.
  useEffect(() => {
    if (status === "done") setFiles(contents.files);
  }, [status, contents.files, setFiles]);

  if (!root || !folder) return null;

  const segments = folder.path ? folder.path.split("/") : [];

  // Flache Sammlung ohne Unterordner: Der Baum hätte nur eine einzige Zeile — dann lieber
  // die ganze Spalte weg und die volle Breite für die Songs. Solange noch gelesen wird,
  // bleibt er stehen, sonst würde er bei jedem Wechsel kurz aufblitzen.
  const showTree = folder.path !== "" || status !== "done" || contents.folders.length > 0;

  /** Sprung an eine beliebige Stelle im Pfad — die Handles dafür kommen vom Wurzelordner. */
  const goToPath = (path: string) => {
    void (async () => {
      const parts = path ? path.split("/") : [];
      try {
        let handle = root;
        for (const part of parts) handle = await handle.getDirectoryHandle(part);
        openFolder({ name: parts.at(-1) ?? root.name, path, handle });
      } catch {
        // Ordner ist weg (umbenannt, ausgehängt) — zurück auf den Wurzelordner.
        openFolder({ name: root.name, path: "", handle: root });
      }
    })();
  };

  const enterFolder = (next: SubFolder) => {
    openFolder(next);
    setMobilePane("files");
  };

  return (
    <div
      className={cn(
        "grid h-full min-h-0 grid-cols-1",
        showTree && "md:grid-cols-[minmax(180px,260px)_1fr]",
      )}
    >
      {showTree && (
        <div
          className={cn(
            "min-h-0 overflow-y-auto md:border-r md:border-border",
            mobilePane === "files" && "hidden md:block",
          )}
        >
          <FolderTree root={root} selectedPath={folder.path} onSelect={enterFolder} />
        </div>
      )}

      <div
        className={cn(
          "flex min-h-0 flex-col",
          showTree && mobilePane === "folders" && "hidden md:flex",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          {showTree && (
            <button
              type="button"
              onClick={() => setMobilePane("folders")}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground md:hidden"
            >
              ← Ordner
            </button>
          )}

          <nav className="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => goToPath("")}
              className="shrink-0 truncate hover:text-foreground"
            >
              {root.name}
            </button>
            {segments.map((segment, index) => (
              <span key={segment} className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={() => goToPath(segments.slice(0, index + 1).join("/"))}
                  className="truncate hover:text-foreground"
                >
                  {segment}
                </button>
              </span>
            ))}
          </nav>

          <span className="shrink-0 text-xs text-muted-foreground" title={skippedDetail(contents)}>
            {summarize(contents)}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FileList
            folders={contents.folders}
            files={contents.files}
            skipped={contents.skipped}
            status={status}
            error={error}
            selectedPath={selectedFile?.path}
            onSelect={selectFile}
            onEnterFolder={enterFolder}
          />
        </div>
      </div>
    </div>
  );
};
