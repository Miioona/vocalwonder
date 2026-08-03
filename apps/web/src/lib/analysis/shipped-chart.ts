import type { Chart } from "@vocalwonder/core";

import { findDemoSong } from "@/lib/song-explorer/demo-songs";
import type { AudioFile } from "@/lib/song-explorer/types";
import { ANALYSIS_VERSION, type AnalysisMeta, type AnalysisResult } from "./types";

/**
 * Der fertig mitgelieferte Chart eines Beispielsongs.
 *
 * Die Analyse dauert ungefähr so lange wie der Song — für jemanden, der das Projekt nur
 * ansehen will, ist das zu lang. Und in Browsern ohne WebGPU wäre sie ohnehin keine Option.
 * Deshalb liegt das Ergebnis fertig neben der Datei, erzeugt mit derselben Kette über die
 * Werkbank.
 *
 * Für Songs aus der Bibliothek des Users ändert sich nichts — dort gibt es keinen Eintrag,
 * und es wird gerechnet wie bisher.
 */
export async function readShippedChart(
  file: AudioFile,
  key: string,
): Promise<AnalysisResult | undefined> {
  const demo = findDemoSong(file.path);
  if (!demo) return undefined;

  try {
    const response = await fetch(demo.chartUrl);
    if (!response.ok) throw new Error(`Chart nicht abrufbar (${response.status})`);

    const payload = (await response.json()) as { chart: Chart; meta: AnalysisMeta };

    return {
      // Titel und Artist aus den Angaben zum Beispielsong: Im Chart steht der Dateiname,
      // weil die Werkbank keine Tags liest.
      chart: {
        ...payload.chart,
        title: demo.credit.title,
        artist: demo.credit.artist,
      },
      // Die Tonhöhenkurve wird bewusst nicht mitgeliefert — sie ist der weitaus größte Teil
      // und wird außerhalb der Analyse nirgends gebraucht.
      pitch: { frameMs: 10, midi: EMPTY, clarity: EMPTY, rms: EMPTY },
      meta: { ...payload.meta, songHash: key },
    };
  } catch (err) {
    // Kein Beinbruch: Ohne mitgelieferten Chart wird eben analysiert.
    console.error("[analyse:mitgeliefert]", err);
    return undefined;
  }
}

const EMPTY = new Float32Array();

/**
 * Ob ein mitgelieferter Chart zur aktuellen Analysekette passt.
 *
 * Passt er nicht, bleibt er trotzdem in Gebrauch — spielbar ist er ja. Er gehört dann nur
 * nicht in den Cache, sonst würde ihn `readAnalysis` beim nächsten Lesen wegwerfen und wir
 * holten ihn in Endlosschleife neu.
 */
export function matchesCurrentVersion(result: AnalysisResult): boolean {
  return result.meta.version === ANALYSIS_VERSION;
}
