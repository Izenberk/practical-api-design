import { describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import { app } from "../../src/app.js";
import { createActor, resetContainer } from "../helpers/auth.js";
import type { Actor } from "../helpers/auth.js";

describe('products API', () => {
  let admin: Actor;
  let member: Actor;

  beforeEach(async () => {
    resetContainer();
    admin = await createActor('admin@example.com', 'admin');
    member = await createActor('member@example.com', 'user');
  });

  it('lists products without authentication', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('rejects an unauthenticated create with 401', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .send({ name: 'Keyboard', priceSatang: 289000 });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a non-admin create with 403', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(...member.header)
      .send({ name: 'Keyboard', priceSatang: 289000 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lets an admin create a product and read it back', async () => {
    const created = await request(app)
      .post('/api/v1/products')
      .set(...admin.header)
      .send({ name: 'Keyboard', priceSatang: 289000 });

    expect(created.status).toBe(201);
    expect(created.headers.location).toBe(
      `/api/v1/products/${created.body.data.id}`,
    );

    const found = await request(app).get(
      `/api/v1/products/${created.body.data.id}`,
    );

    expect(found.status).toBe(200);
    expect(found.body.data.name).toBe('Keyboard');
    expect(found.body.data.currency).toBe('THB');
  });

  it('returns 422 for a malformed body', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set(...admin.header)
      .send({ name: '', priceSatang: -1 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('returns 422 for a non-uuid id', async () => {
    const res = await request(app).get('/api/v1/products/not-a-uuid');

    expect(res.status).toBe(422);
  });

  it('returns 404 for a well-formed unknown id', async () => {
    const res = await request(app).get(
      '/api/v1/products/99999999-9999-4999-8999-999999999999'
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('starts each test with an empty catalogue', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.body.data).toEqual([]);
  });
});