import { describe, it, expect, beforeEach } from "@jest/globals";
import { InMemoryCache } from "./memory.cache.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
  });

  it('returns null for a key that was never set', async () => {
    await expect(cache.get('missing')).resolves.toBeNull();
  });

  it('returns the stored value', async () => {
    await cache.set('k1', { name: 'Keyboard' });

    await expect(cache.get('k1')).resolves.toEqual({ name: 'Keyboard' });
  });

  it('keeps distinct keys independent', async () => {
    await cache.set('k1', 1);

    await expect(cache.get('k2')).resolves.toBeNull();
  });

  it('treats an expired entry as a miss', async () => {
    const shortLived = new InMemoryCache(1);

    await shortLived.set('k1', 'value');
    await sleep(10);

    await expect(shortLived.get('k1')).resolves.toBeNull();
  });

  it('invalidates every key under a prefix', async () => {
    await cache.set('products:list:page=1', ['a']);
    await cache.set('products:list:page=2', ['b']);

    await cache.invalidatePrefix('products:list:');

    await expect(cache.get('products:list:page=1')).resolves.toBeNull();
    await expect(cache.get('products:list:page=2')).resolves.toBeNull();
  });

  it('leaves keys outside the prefix alone', async () => {
    await cache.set('products:list:page=1', ['a']);
    await cache.set('orders:list:page=1', ['b']);

    await cache.invalidatePrefix('products:list:');

    await expect(cache.get('orders:list:page=1')).resolves.toEqual(['b']);
  });

  it('empties everything on clear', async () => {
    await cache.set('k1', 1);

    cache.clear();

    await expect(cache.get('k1')).resolves.toBeNull();
  });
});