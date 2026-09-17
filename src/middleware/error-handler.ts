import type { ErrorRequestHandler } from "express";
import { AppError, BadRequestError } from "../core/errors/app-error.js";
import { toStatusCode } from "../core/errors/http-mapper.js";
import { logger } from "../core/logger.js";

/**
 * express.json() rejects a malformed body with a SyntaxError that body-parser
 * tags with `status: 400` and the raw `body`. That is a client mistake, not a
 * fault in this service, so it must not reach the 500 branch. Those two tags
 * are what separate it from a SyntaxError thrown by our own code, which is a
 * real programmer error and still deserves a 500.
 */
interface BodyParseError extends SyntaxError {
  readonly status: number;
  readonly body: unknown;
}

const isBodyParseError = (err: unknown): err is BodyParseError =>
  err instanceof SyntaxError &&
  'status' in err &&
  (err as { status: unknown }).status === 400 &&
  'body' in err;

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  // Normalise framework errors into domain errors, so everything below this
  // line takes the one path that already exists.
  const error = isBodyParseError(err)
    ? new BadRequestError('Request body is not valid JSON')
    : err;

  if (error instanceof AppError) {
    const status = toStatusCode(error);

    logger.warn({
      message: error.message,
      code: error.code,
      status,
      requestId: req.id,
      path: req.originalUrl,
      method: req.method
    });

    res.status(status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId: req.id,
      },
    });
    return;
  }

  logger.error({
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
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
