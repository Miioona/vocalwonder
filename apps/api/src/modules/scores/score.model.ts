import { Schema, model } from "mongoose";

/**
 * Ein gespieltes Ergebnis. Jeder Durchgang wird gespeichert, nicht nur der beste — daraus
 * lassen sich später Verlauf, Bestwerte und Bestenlisten gleichermaßen ableiten.
 *
 * Der Song wird über den **Hash seiner Datei** erkannt, nicht über Pfad oder Titel: Dieselbe
 * Datei ist auf jedem Rechner dieselbe, egal wie sie heißt oder wo sie liegt. Titel und
 * Artist liegen trotzdem mit dabei, damit eine Bestenliste ohne zweite Abfrage lesbar ist.
 */
const scoreSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },

    songHash: { type: String, required: true, index: true },
    title: { type: String, required: true },
    artist: { type: String, default: "" },

    /** 0–10000, wie im Spiel angezeigt. */
    points: { type: Number, required: true, min: 0 },
    /** 0–1, der getroffene Anteil. */
    ratio: { type: Number, required: true, min: 0, max: 1 },
    hitNotes: { type: Number, required: true, min: 0 },
    totalNotes: { type: Number, required: true, min: 0 },
    /** Dauer des gesungenen Songs — trennt abgebrochene Versuche von vollen Durchgängen. */
    durationMs: { type: Number, required: true, min: 0 },

    /** Fassung der Analysekette, mit der der Chart entstanden ist. */
    analysisVersion: { type: Number, required: true },

    /** Allein gesungen oder im Duell — getrennte Bestenlisten. */
    gameType: { type: String, enum: ["solo", "duel"], default: "solo", index: true },
    /** Klammert die Ergebnisse einer Lobby-Sitzung zusammen. */
    roundId: { type: String, index: true },
  },
  { timestamps: true },
);

// Bestenliste pro Song: höchste Punktzahl zuerst.
scoreSchema.index({ songHash: 1, points: -1 });

export const ScoreModel = model("Score", scoreSchema);
