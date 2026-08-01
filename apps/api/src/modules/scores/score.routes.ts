import { Router } from "express";

import { requireSession } from "../../middleware/require-session.js";
import { getMyScores, postScore } from "./score.controller.js";

export const scoresRouter: Router = Router();

// Ergebnisse gehören immer zu einem Konto — ohne Anmeldung gibt es nichts zu speichern.
scoresRouter.post("/", requireSession, postScore);
scoresRouter.get("/me", requireSession, getMyScores);
