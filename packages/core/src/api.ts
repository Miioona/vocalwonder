/** Shared API contract between `apps/api` and `apps/web`. */

/** Standard envelope every API endpoint returns. */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiError };

export interface ApiError {
  /** Machine-readable error code, e.g. "NOT_FOUND". */
  code: string;
  /** Human-readable message. */
  message: string;
  /** Optional field-level validation issues. */
  details?: Record<string, string[]>;
}

/** Response of the backend health endpoint (`GET /health`). */
export interface HealthStatus {
  status: "ok";
  uptime: number;
  timestamp: string;
}
