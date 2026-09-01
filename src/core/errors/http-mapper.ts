import type { AppError } from "./app-error.js";

const STATUS: Record<string, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  FORBIDDEN: 403,
  VALIDATION_FAILED: 422,
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
};

export const toStatusCode = (err: AppError): number => STATUS[err.code] ?? 500;