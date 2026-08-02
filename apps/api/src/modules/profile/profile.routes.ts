import { Router } from "express";

import { requireSession } from "../../middleware/require-session.js";
import { getMyProfile, getNameAvailability, putMyProfile } from "./profile.controller.js";

export const profileRouter: Router = Router();

profileRouter.get("/me", requireSession, getMyProfile);
profileRouter.put("/me", requireSession, putMyProfile);
profileRouter.get("/name-available", requireSession, getNameAvailability);
