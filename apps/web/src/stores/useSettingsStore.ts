import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Einstellungen, die der User setzt. Werden dauerhaft im Browser gemerkt.
 *
 * Getrennt vom Explorer- und Player-Store: Diese Werte ändern sich selten, aber sie werden
 * an vielen Stellen gelesen — die Renderschleife holt sich den Latenzausgleich zum Beispiel
 * pro Frame direkt über `getState()`, ohne React dazwischen.
 */
export type ThemeName = "dark" | "light";

export interface Settings {
  /** Dunkel ist der Standard — der Spielmodus ist es ohnehin immer. */
  theme: ThemeName;
  /**
   * Ausgleich der Verzögerung in Millisekunden.
   *
   * Zwischen "die App spielt einen Ton ab" und "du hörst ihn" liegen bei Bluetooth schnell
   * 200 ms; dieselbe Strecke nochmal zurück vom Mikrofon. Du singst zu dem, was du hörst —
   * die App vergleicht aber mit ihrer eigenen Uhr. Ohne Ausgleich wärst du dadurch
   * systematisch "zu spät", obwohl du im Takt bist.
   *
   * Größerer Wert = deine Stimme wird weiter nach vorn geschoben.
   */
  latencyMs: number;
  /**
   * Solange `true`, übernimmt die App den vom Browser gemeldeten Wert beim Start eines Songs.
   * Der erste Zug am Regler schaltet sie ab — sonst würde die eigene Einstellung beim
   * nächsten Song wieder überschrieben.
   */
  latencyAuto: boolean;
  /**
   * Wie empfindlich das Mikrofon Töne erkennt (0–1). Höher heißt: auch leise und unsaubere
   * Töne zählen — dann werden aber auch Hintergrundgeräusche als Gesang erkannt.
   */
  micSensitivity: number;
  /** Wiedergabelautstärke des Songs (0–1). */
  volume: number;
  /** Ausgewähltes Eingabegerät; leer bedeutet Systemvorgabe. */
  inputDeviceId?: string;
  /** Ausgewähltes Ausgabegerät; leer bedeutet Systemvorgabe. */
  outputDeviceId?: string;
  /** Eigenen Gesang mithören. Standardmäßig aus — ohne Kopfhörer gibt es Rückkopplung. */
  monitorEnabled: boolean;
  /** Lautstärke des Mithörens (0–1). */
  monitorVolume: number;
}

interface SettingsState extends Settings {
  update: (changes: Partial<Settings>) => void;
  reset: () => void;
}

const DEFAULTS: Settings = {
  theme: "dark",
  latencyMs: 0,
  latencyAuto: true,
  micSensitivity: 0.3,
  volume: 0.8,
  inputDeviceId: undefined,
  outputDeviceId: undefined,
  monitorEnabled: false,
  monitorVolume: 0.4,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (changes) => set(changes),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "vocalwonder-settings",
      // Gerätewahl bewusst mitgespeichert: Die IDs bleiben pro Browser stabil, und ein
      // verschwundenes Gerät fällt beim Anwenden auf die Systemvorgabe zurück.
      version: 1,
    },
  ),
);
