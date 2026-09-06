import { describe, it, expect, beforeEach } from "@jest/globals";
import { InMemoryIdempotencyStore } from "./idempotency.store.memory.js";

const HASH_A = 'hash-a';
const HASH_B = 'hash-b';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('InMemoryIdempotencyStore', () => {
  let store: InMemoryIdempotencyStore;

  beforeEach(() => {
    store = new InMemoryIdempotencyStore();
  });

  it('returns null when claiming a free key', async () => {
    await expect(store.claim('k1', HASH_A)).resolves.toBeNull();
  });

  it('reports in_progress when the same key is claimed twice', async () => {
    await store.claim('k1', HASH_A);

    const second = await store.claim('k1', HASH_A);

    expect(second).toEqual({ state: 'in_progress', requestHash: HASH_A });
  });

  it('returns the stored response once completed', async () => {
    await store.claim('k1', HASH_A);
    await store.complete('k1', 201, { data: { id: 'order-1' } });

    const replay = await store.claim('k1', HASH_A);

    expect(replay).toEqual({
      state: 'completed',
      requestHash: HASH_A,
      statusCode: 201,
      body: { data: { id: 'order-1' } },
    });
  });

  it('keeps the original request hash through completion', async () => {
    await store.claim('k1', HASH_A);
    await store.complete('k1', 201, { ok: true });

    const replay = await store.claim('k1', HASH_B);

    expect(replay?.requestHash).toBe(HASH_A);
  });

  it('frees the key after release', async () => {
    await store.claim('k1', HASH_A);
    await store.release('k1');

    await expect(store.claim('k1', HASH_A)).resolves.toBeNull();
  });

  it('keeps distinct keys independent', async () => {
    await store.claim('k1', HASH_A);

    await expect(store.claim('k2', HASH_A)).resolves.toBeNull();
  });

  it('ignores complete() for a key that was never claimed', async () => {
    await store.complete('ghost', 201, { ok: true });

    await expect(store.claim('ghost', HASH_A)).resolves.toBeNull();
  });

  it('treats an expired entry as free', async () => {
    const shortLived = new InMemoryIdempotencyStore(1);

    await shortLived.claim('k1', HASH_A);
    await shortLived.complete('k1', 201, { ok: true });

    await sleep(10);

    await expect(shortLived.claim('k1', HASH_A)).resolves.toBeNull();
  });
});