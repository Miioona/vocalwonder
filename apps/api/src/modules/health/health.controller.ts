import type { RequestHandler } from "express";
import type { ApiResponse, HealthStatus } from "@vocalwonder/core";

export const getHealth: RequestHandler = (_req, res) => {
  const body: ApiResponse<HealthStatus> = {
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  };
  res.json(body);
};
