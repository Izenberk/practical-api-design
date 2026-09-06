import type {
  IdempotencyStore,
  IdempotencyRecord,
} from "./idempotency.store.js";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

interface Entry {
  readonly record: IdempotencyRecord;
  readonly expiresAt: number;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entires = new Map<string, Entry>();

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async claim(key: string, requestHash: string): Promise<IdempotencyRecord | null> {
    const existing = this.read(key);

    if (existing !== null) return existing;

    this.entires.set(key, {
      record: { state: 'in_progress', requestHash },
      expiresAt: Date.now() + this.ttlMs,
    });

    return null;
  }

  async complete(
    key: string,
    statusCode: number,
    body: unknown,
  ): Promise<void> {
    const entry = this.entires.get(key);
    if (entry === undefined) return;

    this.entires.set(key, {
      record: {
        state: 'completed',
        requestHash: entry.record.requestHash,
        statusCode,
        body,
      },
      expiresAt: entry.expiresAt,
    });
  }

  async release(key: string): Promise<void> {
    this.entires.delete(key);
  }

  private read(key: string): IdempotencyRecord | null {
    const entry = this.entires.get(key);
    if (entry === undefined) return null;

    if (entry.expiresAt <= Date.now()) {
      this.entires.delete(key);
      return null;
    }

    return entry.record;
  }

  clear(): void {
    this.entires.clear();
  }
}