import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import type { IdempotencyStore } from "../core/idempotency/idempotency.store.js";
import { requesterOf } from "./authenticate.js";
import {
  BadRequestError,
  ConflictError,
} from "../core/errors/app-error.js";

const HEADER = 'idempotency-key';

const hashBody = (body: unknown): string =>
  createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');

export const idempotency =
(store: IdempotencyStore): RequestHandler => async (req, res, next) => {
  const provided = req.headers[HEADER];

  if (typeof provided !== 'string' || provided.trim() === '') {
    next(
      new BadRequestError(
        'A non-empty Idempotency-Key header is required for this request',
      ),
    );
    return;
  }

  const requester = requesterOf(req);
  const key = `${requester.id}:${req.method}:${req.baseUrl}${req.path}:${provided.trim()}`;
  const requestHash = hashBody(req.body);

  const existing = await store.claim(key, requestHash);

  if (existing !== null) {
    if (existing.requestHash !== requestHash) {
      next(
        new ConflictError('This Idempotency-Key was already used with a different request body'),
      );
      return;
    }

    if (existing.state === 'in_progress') {
      next(
        new ConflictError('A request with this Idempotency-Key is already in progress'),
      );
      return;
    }

    res
      .status(existing.statusCode)
      .set('Idempotent-Replay', 'true')
      .json(existing.body);
    return;
  }

  const sendJson = res.json.bind(res);

  res.json = (body?: unknown) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      void store.complete(key, res.statusCode, body);
    } else {
      void store.release(key);
    }

    return sendJson(body);
  };

  next();
};