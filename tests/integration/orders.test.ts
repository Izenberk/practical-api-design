import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../../src/app.js";
import { createActor, resetContainer } from "../helpers/auth.js";
import type { Actor } from "../helpers/auth.js";

const PRICE_SATANG = 289000;

describe('orders API', () => {
  let admin: Actor;
  let member: Actor;
  let other: Actor;

  beforeEach(async () => {
    resetContainer();
    admin = await createActor('admin@example.com', 'admin');
    member = await createActor('member@example.com', 'user');
    other = await createActor('other@example.com', 'user');
  });

  const createProduct = async (priceSatang = PRICE_SATANG): Promise<string> => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(...admin.header)
      .send({ name: 'Keyboard', priceSatang, stock: 10 });

    return res.body.data.id as string;
  };

  const postOrder = (
    actor: Actor,
    productId: string,
    quantity = 1,
    key: string = randomUUID(),
  ) =>
    request(app)
      .post('/api/v1/orders')
      .set(...actor.header)
      .set('Idempotency-Key', key)
      .send({ items: [{ productId, quantity }] });

  describe('authentication and validation', () => {
    it('rejects an unauthenticated create with 401', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Idempotency-Key', randomUUID())
        .send({ items: [{ productId: randomUUID(), quantity: 1 }] });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('requires an Idempotency-Key', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/orders')
        .set(...member.header)
        .send({ items: [{ productId, quantity: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects an empty items array with 422', async () => {
      const res = await postOrder(member, randomUUID(), 1);
      const empty = await request(app)
        .post('/api/v1/orders')
        .set(...member.header)
        .set('Idempotency-Key', randomUUID())
        .send({ items: [] });

      expect(res.status).toBe(422);
      expect(empty.status).toBe(422);
      expect(empty.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects the same product twice in one order with 422', async () => {
      const productId = await createProduct();

      const res = await request(app)
        .post('/api/v1/orders')
        .set(...member.header)
        .set('Idempotency-Key', randomUUID())
        .send({
          items: [
            { productId, quantity: 1 },
            { productId, quantity: 2 },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('creation', () => {
    it('prices the order from the catalogue, not the request', async () => {
      const productId = await createProduct();

      const res = await postOrder(member, productId, 3);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.userId).toBe(member.user.id);
      expect(res.body.data.totalSatang).toBe(PRICE_SATANG * 3);
      expect(res.body.data.items[0].unitPriceSatang).toBe(PRICE_SATANG);
      expect(res.header.location).toBe(`/api/v1/orders/${res.body.data.id}`);
    });
  });

  describe('idempotency', () => {
    it('replays the stored response instead of creating a second order', async () => {
      const productId = await createProduct();
      const key = randomUUID();

      const first = await postOrder(member, productId, 1, key);
      const replay = await postOrder(member, productId, 1, key);

      expect(replay.status).toBe(201);
      expect(replay.headers['idempotent-replay']).toBe('true');
      expect(replay.body.data.id).toBe(first.body.data.id);

      const list = await request(app)
        .get('/api/v1/orders')
        .set(...member.header);

      expect(list.body.data).toHaveLength(1);
    });

    it('rejects a reused key carrying a different body with 409', async () => {
      const productId = await createProduct();
      const key = randomUUID();

      await postOrder(member, productId, 1, key);
      const res = await postOrder(member, productId, 2, key);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('scopes a key to its user, so two users may reuse the same string', async () => {
      const productId = await createProduct();
      const key = randomUUID();

      const mine = await postOrder(member, productId, 1, key);
      const theirs = await postOrder(other, productId, 1, key);

      expect(mine.status).toBe(201);
      expect(theirs.status).toBe(201);
      expect(theirs.headers['idempotent-replay']).toBeUndefined();
      expect(theirs.body.data.id).not.toBe(mine.body.data.id);
    });
  });

  describe('ownership and role', () => {
    it("hides another user's order behind 404, but shows it to an admin", async () => {
      const productId = await createProduct();
      const created = await postOrder(member, productId);
      const orderId = created.body.data.id as string;

      const asOther = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set(...other.header);
      const asAdmin = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set(...admin.header);

      expect(asOther.status).toBe(404);
      expect(asOther.body.error.code).toBe('NOT_FOUND');
      expect(asAdmin.status).toBe(200);
      expect(asAdmin.body.data.id).toBe(orderId);
    });

    it('lists only the caller’s own orders, and every order for an admin', async () => {
      const productId = await createProduct();
      await postOrder(member, productId);
      await postOrder(other, productId);

      const asMember = await request(app)
        .get('/api/v1/orders')
        .set(...member.header);
      const asAdmin = await request(app)
        .get('/api/v1/orders')
        .set(...admin.header);

      expect(asMember.body.data).toHaveLength(1);
      expect(asMember.body.data[0].userId).toBe(member.user.id);
      expect(asAdmin.body.data).toHaveLength(2);
    });

    it('refuses a non-admin delete with 403, and lets an admin through', async () => {
      const productId = await createProduct();
      const created = await postOrder(member, productId);
      const orderId = created.body.data.id as string;

      const asOwner = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set(...member.header);

      expect(asOwner.status).toBe(403);
      expect(asOwner.body.error.code).toBe('FORBIDDEN');

      const asAdmin = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set(...admin.header);

      expect(asAdmin.status).toBe(204);
    });
  });

  describe('cache scoping', () => {
    it("never serves one user's cached list to another", async () => {
      const productId = await createProduct();
      await postOrder(member, productId);

      const mine = await request(app)
        .get('/api/v1/orders')
        .set(...member.header);
      const theirs = await request(app)
        .get('/api/v1/orders')
        .set(...other.header);

      expect(mine.body.data).toHaveLength(1);
      expect(theirs.body.data).toHaveLength(0);
    });

    it('shows a new order in a list that was already cached', async () => {
      const productId = await createProduct();

      const before = await request(app)
        .get('/api/v1/orders')
        .set(...member.header);

      await postOrder(member, productId);

      const after = await request(app)
        .get('/api/v1/orders')
        .set(...member.header);

      expect(before.body.data).toHaveLength(0);
      expect(after.body.data).toHaveLength(1);
    });
  });

  describe('status transitions', () => {
    const putStatus = (actor: Actor, orderId: string, status: string) =>
      request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set(...actor.header)
        .send({ status });

    const pendingOrder = async (): Promise<string> => {
      const productId = await createProduct();
      const created = await postOrder(member, productId);
      return created.body.data.id as string;
    };

    it('lets the owner cancel their own pending order', async () => {
      const orderId = await pendingOrder();

      const res = await putStatus(member, orderId, 'cancelled');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('refuses to let the owner mark their own order paid', async () => {
      const orderId = await pendingOrder();

      const res = await putStatus(member, orderId, 'paid');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects a transition the machine does not define with 409', async () => {
      const orderId = await pendingOrder();

      const res = await putStatus(member, orderId, 'delivered');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('lets an admin move an order from pending to paid', async () => {
      const orderId = await pendingOrder();

      const res = await putStatus(admin, orderId, 'paid');

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('paid');
    });

    it('rejects an unknown status with 422', async () => {
      const orderId = await pendingOrder();

      const res = await putStatus(member, orderId, 'refunded');

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });
});
