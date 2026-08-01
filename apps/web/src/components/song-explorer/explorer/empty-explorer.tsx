import { FolderPicker } from "../header/folder-picker";

/** Platzhalter, solange kein Songordner freigegeben ist — hält das Layout in Form. */
export const EmptyExplorer = () => {
  return (
    <div className="flex flex-col space-y-2 h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <p>Noch kein Songordner freigegeben.</p>
      <FolderPicker />
    </div>
  );
};
