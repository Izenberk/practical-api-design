import type { CacheStore } from "./cache.port.js";

const DEFAULT_TTL_MS = 60 * 1000;

interface Entry {
  readonly value: unknown;
  readonly expiresAs: number;
}

export class InMemoryCache implements CacheStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (entry === undefined) return null;

    if (entry.expiresAs <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAs: Date.now() + this.ttlMs,
    });
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  clear(): void{
    this.entries.clear();
  }
}