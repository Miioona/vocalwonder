import { Router } from "express";

import { requireSession } from "../../middleware/require-session.js";
import {
  deleteFriendship,
  getFriends,
  getPlayerSearch,
  postAccept,
  postRequest,
} from "./friend.controller.js";

export const friendsRouter: Router = Router();

friendsRouter.use(requireSession);

friendsRouter.get("/", getFriends);
friendsRouter.get("/search", getPlayerSearch);
friendsRouter.post("/requests", postRequest);
friendsRouter.post("/:userId/accept", postAccept);
// Deckt ablehnen, zurückziehen und entfernen ab.
friendsRouter.delete("/:userId", deleteFriendship);
