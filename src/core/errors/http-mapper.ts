import type { AppError } from "./app-error.js";

const STATUS: Record<string, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_FAILED: 422,
  TOO_MANY_REQUESTS: 429,
};

export const toStatusCode = (err: AppError): number => STATUS[err.code] ?? 500;