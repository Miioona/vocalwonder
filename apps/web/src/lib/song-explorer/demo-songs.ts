import type { AudioFile } from "./types";

/**
 * Was zu einem Beispielsong gesagt werden muss.
 *
 * CC BY verlangt die Nennung dort, wo das Stück benutzt wird — nicht bloß im Repository.
 * Deshalb steht die Herkunft hier neben der Datei und nicht nur in `public/demos/CREDITS.md`.
 */
export interface DemoCredit {
  title: string;
  artist: string;
  /** Woher die Datei stammt — verlinkt in der Oberfläche. */
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}

export interface DemoSong extends AudioFile {
  url: string;
  credit: DemoCredit;
}

/**
 * Mitgelieferte Songs für alle, die keinen Ordner freigeben können oder wollen.
 *
 * Firefox kennt die File System Access API nicht — dort ist die Bibliothek gar nicht
 * benutzbar. Ohne diese Songs bliebe die App für solche Besucher eine leere Hülle.
 */
export const DEMO_SONGS: DemoSong[] = [
  {
    path: "demos/Josh Woodward - The Voices.mp3",
    name: "Josh Woodward - The Voices.mp3",
    url: "/demos/Josh%20Woodward%20-%20The%20Voices.mp3",
    credit: {
      title: "The Voices",
      artist: "Josh Woodward",
      sourceUrl:
        "https://freemusicarchive.org/music/Josh_Woodward/Breadcrumbs/JoshWoodward-Breadcrumbs-10-TheVoices/",
      license: "CC BY",
      // FMA nennt keine Fassung, der Künstler gibt 4.0 an — die Auflagen sind gleich.
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  {
    path: "demos/Franzi Kruth - Chasing Clouds.mp3",
    name: "Franzi Kruth - Chasing Clouds.mp3",
    url: "/demos/Franzi%20Kruth%20-%20Chasing%20Clouds.mp3",
    credit: {
      title: "Chasing Clouds",
      artist: "Franzi Kruth",
      sourceUrl:
        "https://freemusicarchive.org/music/franzi-kruth/love-is-art-vol-1-2/chasing-clouds-2/",
      license: "CC BY",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
];
