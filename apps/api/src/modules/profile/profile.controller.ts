import type { RequestHandler } from "express";
import { z } from "zod";
import type { ApiResponse, PlayerProfile } from "@vocalwonder/core";
import { PLAYER_NAME_MAX, PLAYER_NAME_MIN, PLAYER_NAME_PATTERN } from "@vocalwonder/core";

import {
  PlayerNameTakenError,
  getProfile,
  isPlayerNameAvailable,
  setPlayerName,
} from "./profile.service.js";

const playerNameSchema = z.object({
  playerName: z
    .string()
    .trim()
    .min(PLAYER_NAME_MIN)
    .max(PLAYER_NAME_MAX)
    .regex(PLAYER_NAME_PATTERN, "Erlaubt sind Buchstaben, Ziffern, _ und -"),
});

/** `null`, solange noch kein Name gesetzt wurde — das Frontend fragt dann danach. */
export const getMyProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const profile = await getProfile(user.id);
    const body: ApiResponse<PlayerProfile | null> = { success: true, data: profile };
    res.json(body);
  } catch (err) {
    next(err);
  }
};

export const putMyProfile: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const parsed = playerNameSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: z.prettifyError(parsed.error) },
      });
      return;
    }

    const profile = await setPlayerName(user.id, parsed.data.playerName);
    const body: ApiResponse<PlayerProfile> = { success: true, data: profile };
    res.json(body);
  } catch (err) {
    if (err instanceof PlayerNameTakenError) {
      res.status(409).json({
        success: false,
        error: { code: "NAME_TAKEN", message: err.message },
      });
      return;
    }
    next(err);
  }
};

/** Rückmeldung beim Tippen. Verbindlich ist erst das Speichern. */
export const getNameAvailability: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return;

    const parsed = playerNameSchema.safeParse({ playerName: req.query.name });
    if (!parsed.success) {
      const body: ApiResponse<{ available: boolean }> = {
        success: true,
        data: { available: false },
      };
      res.json(body);
      return;
    }

    const available = await isPlayerNameAvailable(parsed.data.playerName, user.id);
    const body: ApiResponse<{ available: boolean }> = { success: true, data: { available } };
    res.json(body);
  } catch (err) {
    next(err);
  }
};
