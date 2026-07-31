import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { healthRouter } from "./modules/health/health.routes.js";

/** Frontend origins allowed to call the API. */
const allowedOrigins =
  env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:3000", // apps/web
      ];

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/health", healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
