import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { createActor, resetContainer } from "../helpers/auth.js";
import type { Actor } from "../helpers/auth.js";

const OK_SATANG = 289000;
const DECLINE_SATANG = 289013;

describe('payments API', () => {
  let admin: Actor;
  let member: Actor;
  let other: Actor;

  beforeEach(async () => {
    resetContainer();
    admin = await createActor('admin@example.com', 'admin');
    member = await createActor('member@example.com', 'user');
    other = await createActor('other@example.com', 'user');
  });

  const createOrder = async (
    actor: Actor,
    priceSatang: number,
  ): Promise<string> => {
    const product = await request(app)
      .post('/api/v1/products')
      .set(...admin.header)
      .send({ name: 'Keyboard', priceSatang });

    const order = await request(app)
      .post('/api/v1/orders')
      .set(...actor.header)
      .set('Idempotency-Key', randomUUID())
      .send({ items: [{ productId: product.body.data.id, quantity: 1 }] });

    return order.body.data.id as string;
  };

  it('rejects an unauthenticated payment with 401', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: randomUUID() });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('requires an Idempotency-Key', async () => {
    const orderId = await createOrder(member, OK_SATANG);

    const res = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .send({ orderId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('pays a pending order and moves it to paid', async () => {
    const orderId = await createOrder(member, OK_SATANG);

    const paid = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId });

    expect(paid.status).toBe(201);
    expect(paid.body.data.status).toBe('succeeded');
    expect(paid.body.data.failureReason).toBeNull();
    expect(paid.header.location).toBe(
      `/api/v1/payments/${paid.body.data.id}`,
    );

    const order = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set(...member.header);

    expect(order.body.data.status).toBe('paid');
  });

  it('replays the stored response for a repeated key, without charging twice', async () => {
    const orderId = await createOrder(member, OK_SATANG);
    const key = randomUUID();

    const first = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', key)
      .send({ orderId });

    const replay = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', key)
      .send({ orderId });

    expect(replay.status).toBe(201);
    expect(replay.headers['idempotent-replay']).toBe('true');
    expect(replay.body.data.id).toBe(first.body.data.id);

    const list = await request(app)
      .get('/api/v1/payments')
      .set(...member.header);

    expect(list.body.data).toHaveLength(1);
  });

  it('rejects a reused key carrying a different body with 409', async () => {
    const firstOrder = await createOrder(member, OK_SATANG);
    const secondOrder = await createOrder(member, OK_SATANG);
    const key = randomUUID();

    await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', key)
      .send({ orderId: firstOrder });

    const res = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', key)
      .send({ orderId: secondOrder });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('records a decline as a failed payment and leaves the order pending', async () => {
    const orderId = await createOrder(member, DECLINE_SATANG);

    const res = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('failed');
    expect(res.body.data.failureReason).toBe('Card declined');

    const order = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set(...member.header);

    expect(order.body.data.status).toBe('pending');
  });

  it("hides another user's order behind 404", async () => {
    const orderId = await createOrder(member, OK_SATANG);

    const res = await request(app)
      .post('/api/v1/payments')
      .set(...other.header)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects paying an already-paid order with 409', async () => {
    const orderId = await createOrder(member, OK_SATANG);

    await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId });

    const res = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('shows a user only their own payments, and an admin all of them', async () => {
    const mine = await createOrder(member, OK_SATANG);
    const theirs = await createOrder(other, OK_SATANG);

    for (const [actor, orderId] of [
      [member, mine],
      [other, theirs],
    ] as const) {
      await request(app)
        .post('/api/v1/payments')
        .set(...actor.header)
        .set('Idempotency-Key', randomUUID())
        .send({ orderId });
    }

    const asMember = await request(app)
      .get('/api/v1/payments')
      .set(...member.header);
    const asAdmin = await request(app)
      .get('/api/v1/payments')
      .set(...admin.header);

    expect(asMember.body.data).toHaveLength(1);
    expect(asMember.body.data[0].userId).toBe(member.user.id);
    expect(asAdmin.body.data).toHaveLength(2);
  });

  it('returns 422 for a non-uuid orderId', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set(...member.header)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: 'not-a-uuid' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});