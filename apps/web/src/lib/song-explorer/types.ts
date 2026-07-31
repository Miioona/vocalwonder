/** Das Datenmodell der Songbibliothek. Gelesen wird hier nichts — nur Pfade und Handles. */

export interface AudioFile {
  /** Pfad relativ zum Songordner, z. B. "Queen/Bohemian Rhapsody.mp3". */
  path: string;
  name: string;
  handle: FileSystemFileHandle;
}

export interface SubFolder {
  name: string;
  /** Pfad relativ zum Songordner. Leer für den Wurzelordner. */
  path: string;
  handle: FileSystemDirectoryHandle;
}

/** Aus den Tags der Datei gelesen. Alles optional — viele Dateien sind schlecht getaggt. */
export interface SongMetadata {
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  /** Object-URL des eingebetteten Covers. Muss freigegeben werden, sonst leckt Speicher. */
  coverUrl?: string;
}

export interface SkippedKind {
  /** Endung ohne Punkt, oder eine Sammelkategorie wie "versteckt". */
  extension: string;
  count: number;
}

export interface DirectoryContents {
  folders: SubFolder[];
  files: AudioFile[];
  /**
   * Was der Filter aussortiert hat. Damit ein scheinbar leerer Ordner erklären kann,
   * *warum* er leer ist — statt den User raten zu lassen.
   */
  skipped: SkippedKind[];
}
