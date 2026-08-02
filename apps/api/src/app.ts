import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { isConnected } from "./db/connect.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { getAuth } from "./modules/auth/auth.js";
import { friendsRouter } from "./modules/friends/friend.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { scoresRouter } from "./modules/scores/score.routes.js";

/**
 * Frontend-Adressen, die mit Cookies zugreifen dürfen.
 *
 * Der Browser schickt seinen Ursprung immer ohne Schrägstrich am Ende. Ein `WEB_ORIGIN` mit
 * Schrägstrich würde also nie passen — und `cors` lehnt dann still ab, ohne Fehler im Log.
 */
const allowedOrigins = [env.WEB_ORIGIN.replace(/\/+$/, "")];

const corsOptions: CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Ohne Ursprung kommen Aufrufe ohne Browser — curl, Render-Statusprüfung.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);

    console.warn(`[cors] abgelehnt: ${origin} (erlaubt: ${allowedOrigins.join(", ")})`);
    callback(null, false);
  },
};

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(morgan("dev"));

  // **Vor** `express.json()`: better-auth liest den Rumpf selbst. Wird er vorher geparst,
  // kommt beim Handler nichts mehr an.
  if (isConnected()) {
    app.all("/api/auth/*splat", toNodeHandler(getAuth()));
  }

  app.use(express.json());
  app.use(cookieParser());

  app.use("/health", healthRouter);
  app.use("/friends", friendsRouter);
  app.use("/profile", profileRouter);
  app.use("/scores", scoresRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
