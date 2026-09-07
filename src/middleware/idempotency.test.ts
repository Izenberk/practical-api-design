import { describe, it, expect, beforeEach } from "@jest/globals";
import express from "express";
import type { RequestHandler } from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { idempotency } from "./idempotency.js";
import { errorHandler } from "./error-handler.js";
import { InMemoryIdempotencyStore } from "../core/idempotency/idempotency.store.memory.js";

const ALICE = randomUUID();
const BOB = randomUUID();

const buildApp = (
  store: InMemoryIdempotencyStore,
  handler: RequestHandler,
  userId: string = ALICE,
) => {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    req.id = randomUUID();
    req.user = { sub: userId, email: 'someone@example.com', role: 'user' };
    next();
  });

  app.post('/things', idempotency(store), handler);
  app.use(errorHandler);

  return app;
};

describe('idempotency middleware', () => {
  let store: InMemoryIdempotencyStore;
  let calls: number;
  let ok: RequestHandler;

  beforeEach(() => {
    store = new InMemoryIdempotencyStore();
    calls = 0;

    ok = (_req, res) => {
      calls += 1;
      res.status(201).json({ data: { id: `order-${calls}` } });
    };
  });

  it('rejects a request with no Idempotency-Key', async () => {
    const res = await request(buildApp(store, ok))
      .post('/things')
      .send({ n: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(calls).toBe(0);
  });

  it('rejects a blank Idempotency-Key', async () => {
    const res = await request(buildApp(store, ok))
      .post('/things')
      .set('Idempotency-Key', '   ')
      .send({ n: 1 });

    expect(res.status).toBe(400);
    expect(calls).toBe(0);
  });

  it('runs the handler on the first request', async () => {
    const res = await request(buildApp(store, ok))
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { id: 'order-1' } });
    expect(calls).toBe(1);
  });

  it('replays the stored response without running the handler again', async () => {
    const app = buildApp(store, ok);

    const first = await request(app)
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    const second = await request(app)
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replay']).toBe('true');
    expect(calls).toBe(1);
  });

  it('rejects the same key used with a different body', async () => {
    const app = buildApp(store, ok);

    await request(app)
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    const res = await request(app)
      .post('/things')
      .set('Idempotency-key', 'k1')
      .send({ n: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(calls).toBe(1);
  });

  it('return 409 while an identical request is still in progress', async () => {
    await store.claim(`${ALICE}:POST:/things:k1`, 'whatever-hash');

    const res = await request(buildApp(store, ok))
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    expect(res.status).toBe(409);
    expect(calls).toBe(0);
  });

  it('scope keys per user', async () => {
    await request(buildApp(store, ok, ALICE))
      .post('/things')
      .set('Idempotency-Key', 'sharded')
      .send({ n: 1 });

    const res = await request(buildApp(store, ok, BOB))
      .post('/things')
      .set('Idempotency-Key', 'shared')
      .send({ n: 1 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ data: { id: 'order-2' } });
    expect(calls).toBe(2);
  });

  it('releases the key when the handler fails, so a retry can proceed', async () => {
    const flaky: RequestHandler = (_req, res) => {
      calls += 1;

      if (calls === 1) {
        throw new Error('transient failure');
      }

      res.status(201).json({ data: { id: 'order-after-retry' } });
    };

    const app = buildApp(store, flaky);

    const failed = await request(app)
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    expect(failed.status).toBe(500);

    const retried = await request(app)
      .post('/things')
      .set('Idempotency-Key', 'k1')
      .send({ n: 1 });

    expect(retried.status).toBe(201);
    expect(retried.body).toEqual({ data: { id: 'order-after-retry' } });
    expect(calls).toBe(2);
  });
});