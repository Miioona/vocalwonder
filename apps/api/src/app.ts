import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { isConnected } from "./db/connect.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { getAuth } from "./modules/auth/auth.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { scoresRouter } from "./modules/scores/score.routes.js";

/** Frontend-Adressen, die mit Cookies zugreifen dürfen. */
const allowedOrigins = [env.WEB_ORIGIN];

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(morgan("dev"));

  // **Vor** `express.json()`: better-auth liest den Rumpf selbst. Wird er vorher geparst,
  // kommt beim Handler nichts mehr an.
  if (isConnected()) {
    app.all("/api/auth/*splat", toNodeHandler(getAuth()));
  }

  app.use(express.json());
  app.use(cookieParser());

  app.use("/health", healthRouter);
  app.use("/scores", scoresRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
