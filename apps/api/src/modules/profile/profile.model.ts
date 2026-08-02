import { Schema, model } from "mongoose";

/**
 * Das eigene Profil neben dem Konto von better-auth.
 *
 * Eine eigene Sammlung statt eines zusätzlichen Feldes in `user`: Die Sammlungen von
 * better-auth verwaltet die Bibliothek, und ein eigener Index darauf wäre eine Verabredung
 * über Bandengrenzen hinweg. Hier gehört uns alles.
 */
const profileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },

    /** So geschrieben, wie der User ihn eingegeben hat — das wird auch angezeigt. */
    playerName: { type: String, required: true },
    /**
     * Kleingeschrieben, für Eindeutigkeit und Suche. Als eigenes Feld statt über eine
     * Collation: Ein Index mit Collation greift nur, wenn jede Abfrage sie ebenfalls angibt —
     * eine vergessene reicht, und die Eindeutigkeit ist stillschweigend weg.
     *
     * Der Eindeutigkeitsindex trägt nebenbei die Präfixsuche ("fab" findet "Fabian").
     */
    playerNameLower: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const ProfileModel = model("Profile", profileSchema);
