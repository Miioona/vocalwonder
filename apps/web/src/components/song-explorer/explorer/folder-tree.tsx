"use client";

import { useState } from "react";

import type { SubFolder } from "@/lib/song-explorer/types";
import { useDirectory } from "@/lib/song-explorer/use-directory";
import { cn } from "@/lib/utils";

interface FolderTreeProps {
  root: FileSystemDirectoryHandle;
  selectedPath: string;
  onSelect: (folder: SubFolder) => void;
}

export const FolderTree = ({ root, selectedPath, onSelect }: FolderTreeProps) => {
  return (
    <ul className="p-2">
      <TreeNode
        folder={{ name: root.name, path: "", handle: root }}
        depth={0}
        selectedPath={selectedPath}
        onSelect={onSelect}
        defaultExpanded
      />
    </ul>
  );
};

interface TreeNodeProps {
  folder: SubFolder;
  depth: number;
  selectedPath: string;
  onSelect: (folder: SubFolder) => void;
  defaultExpanded?: boolean;
}

const TreeNode = ({
  folder,
  depth,
  selectedPath,
  onSelect,
  defaultExpanded = false,
}: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Der Inhalt wird erst gelesen, wenn der Knoten aufgeklappt ist.
  const { contents, status, error } = useDirectory(
    expanded ? folder.handle : undefined,
    folder.path,
  );

  const selected = selectedPath === folder.path;
  const hasChildren = status !== "done" || contents.folders.length > 0;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-md pr-1",
          selected ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:bg-neutral-900",
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={cn("shrink-0 rounded p-1 hover:text-neutral-100", !hasChildren && "invisible")}
          aria-label={expanded ? "Zuklappen" : "Aufklappen"}
        >
          <Chevron open={expanded} />
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            onSelect(folder);
          }}
          className="min-w-0 flex-1 truncate py-1.5 text-left text-sm"
          title={folder.name}
        >
          {folder.name}
        </button>
      </div>

      {expanded && (
        <ul>
          {status === "loading" && contents.folders.length === 0 && (
            <li
              className="py-1 pl-2 text-xs text-neutral-600"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              lädt …
            </li>
          )}
          {status === "error" && (
            <li
              className="py-1 pl-2 text-xs text-red-400"
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              {error ?? "nicht lesbar"}
            </li>
          )}
          {contents.folders.map((child) => (
            <TreeNode
              key={child.path}
              folder={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const Chevron = ({ open }: { open: boolean }) => {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-3 transition-transform", open && "rotate-90")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
