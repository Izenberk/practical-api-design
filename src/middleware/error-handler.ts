import type { ErrorRequestHandler } from "express";
import { AppError } from "../core/errors/app-error.js";
import { toStatusCode } from "../core/errors/http-mapper.js";
import { logger } from "../core/logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const status = toStatusCode(err);

    logger.warn({
      message: err.message,
      code: err.code,
      status,
      requestId: req.id,
      path: req.originalUrl,
      method: req.method
    });

    res.status(status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
        requestId: req.id,
      },
    });
    return;
  }

  logger.error({
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
    requestId: req.id,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: "Internal Server Error",
      requestId: req.id,
    }
  });
};