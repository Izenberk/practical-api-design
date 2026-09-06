export interface IdempotencyInProgress {
  readonly state: 'in_progress';
  readonly requestHash: string;
}

export interface IdempotencyCompleted {
  readonly state: 'completed';
  readonly requestHash: string;
  readonly statusCode: number;
  readonly body: unknown;
}

export type IdempotencyRecord = IdempotencyInProgress | IdempotencyCompleted;

export interface IdempotencyStore {
  /** Returns null when the key was free and is now claimed. */
  claim(key: string, requestHash: string): Promise<IdempotencyRecord | null>;
  complete(key: string, statusCode: number, body: unknown): Promise<void>;
  release(key: string): Promise<void>;
}