import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { getAuth } from "../modules/auth/auth.js";

/**
 * Schützt Routen: liest die Sitzung aus dem Cookie und hängt den Nutzer an `req.user`.
 * Das Gegenstück zu `protect-admin` in anderen Projekten — nur wird hier nicht selbst
 * geprüft, sondern better-auth gefragt.
 */
export const requireSession: RequestHandler = async (req, res, next) => {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Nicht angemeldet" },
      });
      return;
    }

    req.user = { id: session.user.id, email: session.user.email, name: session.user.name };
    next();
  } catch (err) {
    next(err);
  }
};
