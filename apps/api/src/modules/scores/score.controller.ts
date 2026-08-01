import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiResponse, SongScore } from "@vocalwonder/core";

import { getRecentScores, saveScore } from "./score.service.js";

const scoreInputSchema = z.object({
  songHash: z.string().min(8),
  title: z.string().min(1),
  artist: z.string().default(""),
  points: z.number().min(0),
  ratio: z.number().min(0).max(1),
  hitNotes: z.number().int().min(0),
  totalNotes: z.number().int().min(0),
  durationMs: z.number().min(0),
  analysisVersion: z.number().int().min(0),
});

export const postScore: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return; // requireSession hat bereits geantwortet

    const parsed = scoreInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: z.prettifyError(parsed.error) },
      });
      return;
    }

    const score = await saveScore(user.id, parsed.data);
    const body: ApiResponse<SongScore> = { success: true, data: score };
    res.status(201).json(body);
  } catch (err) {
    next(err);
  }
};

export const getMyScores: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const scores = await getRecentScores(user.id);
    const body: ApiResponse<SongScore[]> = { success: true, data: scores };
    res.json(body);
  } catch (err) {
    next(err);
  }
};
