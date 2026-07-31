import type { ErrorRequestHandler, RequestHandler } from "express";
import type { ApiError } from "@vocalwonder/core";

export const notFoundHandler: RequestHandler = (_req, res) => {
  const error: ApiError = { code: "NOT_FOUND", message: "Resource not found" };
  res.status(404).json({ success: false, error });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[error]", err);
  const error: ApiError = {
    code: "INTERNAL_ERROR",
    message: err instanceof Error ? err.message : "Unexpected error",
  };
  res.status(500).json({ success: false, error });
};
