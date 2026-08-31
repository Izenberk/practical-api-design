import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
    });
  });

  it('responds as JSON', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});