import { describe, it, expect } from '@jest/globals';
import express from 'express';
import type { RequestHandler } from 'express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { errorHandler } from './error-handler.js';
import { NotFoundError } from '../core/errors/app-error.js';

const buildApp = (handler: RequestHandler) => {
  const app = express();
  app.use((req, _res, next) => {
    req.id = randomUUID();
    next();
  });
  app.get('/boom', handler);
  app.use(errorHandler);
  return app;
};

describe('errorHandler', () => {
  it('map an AppError to its mapped status and domain code', async () => {
    const app = buildApp((_req, _parse, next) => {
      next(new NotFoundError('Product not found'));
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Product not found');
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });

  it('converts an unknown error to 500 without leaking internals', async () => {
    const app = buildApp(() => {
      throw new Error('db connection failed: password=hunter2');
    });

    const res = await request(app).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Internal Server Error');
    expect(res.body.error).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});