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

/**
 * Mounts express.json() for real rather than faking a SyntaxError, so the
 * test still holds if body-parser changes the shape of what it throws.
 */
const buildJsonApp = (handler?: RequestHandler) => {
  const app = express();
  app.use((req, _res, next) => {
    req.id = randomUUID();
    next();
  });
  app.use(express.json());
  app.post('/echo', handler ?? ((req, res) => {
    res.json({ data: req.body });
  }));
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

  it('accepts a well-formed body, so the guard does not swallow valid requests', async () => {
    const res = await request(buildJsonApp())
      .post('/echo')
      .set('content-type', 'application/json')
      .send('{"hello":"world"}');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ hello: 'world' });
  });

  it('answers a malformed JSON body with 400, not 500', async () => {
    const res = await request(buildJsonApp())
      .post('/echo')
      .set('content-type', 'application/json')
      .send('{"email": broken');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Request body is not valid JSON');
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });

  it('does not leak the unparsable body back to the client', async () => {
    const res = await request(buildJsonApp())
      .post('/echo')
      .set('content-type', 'application/json')
      .send('{"password": hunter2');

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });

  it('still returns 500 for a SyntaxError thrown by our own code', async () => {
    const res = await request(
      buildJsonApp(() => {
        // A real programmer error: same class, but none of body-parser's tags.
        JSON.parse('definitely not json');
      }),
    )
      .post('/echo')
      .set('content-type', 'application/json')
      .send('{"hello":"world"}');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});