import type { SongScore, SongScoreInput } from "@vocalwonder/core";

import { ScoreModel } from "./score.model.js";

type ScoreSource = {
  _id: unknown;
  userId: string;
  songHash: string;
  title: string;
  artist: string;
  points: number;
  ratio: number;
  hitNotes: number;
  totalNotes: number;
  durationMs: number;
  analysisVersion: number;
  gameType?: "solo" | "duel";
  roundId?: string;
  createdAt: Date;
};

function toSongScore(doc: ScoreSource): SongScore {
  return {
    id: String(doc._id),
    userId: doc.userId,
    songHash: doc.songHash,
    title: doc.title,
    artist: doc.artist,
    points: doc.points,
    ratio: doc.ratio,
    hitNotes: doc.hitNotes,
    totalNotes: doc.totalNotes,
    durationMs: doc.durationMs,
    analysisVersion: doc.analysisVersion,
    gameType: doc.gameType,
    roundId: doc.roundId,
    playedAt: doc.createdAt.toISOString(),
  };
}

export async function saveScore(userId: string, input: SongScoreInput): Promise<SongScore> {
  const created = await ScoreModel.create({ ...input, userId });
  return toSongScore(created.toObject() as ScoreSource);
}

/** Die letzten Ergebnisse eines Nutzers, neueste zuerst. */
export async function getRecentScores(userId: string, limit = 20): Promise<SongScore[]> {
  const docs = await ScoreModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .lean();

  return docs.map((doc) => toSongScore(doc as unknown as ScoreSource));
}

/** Bestwert eines Nutzers je Song. */
export async function getBestScore(userId: string, songHash: string): Promise<SongScore | null> {
  const doc = await ScoreModel.findOne({ userId, songHash }).sort({ points: -1 }).lean();
  return doc ? toSongScore(doc as unknown as ScoreSource) : null;
}
