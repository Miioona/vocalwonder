import { Schema, model } from "mongoose";

/**
 * Eine Freundschaft — ein Dokument für beide Seiten, nicht zwei.
 *
 * `requesterId` und `addresseeId` halten fest, wer angefragt hat; daraus ergibt sich, wer
 * annehmen darf. Für die Eindeutigkeit reicht das aber nicht: A→B und B→A wären zwei
 * verschiedene Dokumente. Deshalb `pairKey` — beide IDs sortiert und verbunden. Damit kann es
 * zwischen zwei Konten nur eine Beziehung geben, egal wer zuerst geklickt hat.
 */
const friendshipSchema = new Schema(
  {
    requesterId: { type: String, required: true, index: true },
    addresseeId: { type: String, required: true, index: true },

    pairKey: { type: String, required: true, unique: true },

    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted"],
      default: "pending",
    },

    /** Wann angenommen wurde — bei offenen Anfragen leer. */
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);

/** Sortiert, damit A→B und B→A denselben Schlüssel ergeben. */
export function pairKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export const FriendshipModel = model("Friendship", friendshipSchema);
