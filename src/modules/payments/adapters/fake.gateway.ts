import { randomUUID } from "node:crypto";
import type {
  PaymentGateway,
  ChargeRequest,
  ChargeResult,
} from "../payment.gateway.js"

/**
 * Deterministic stand-in for a real provider. An amount ending in 13 satang
 * fails, so the failure path is reachable from tests and demos without
 * mocking.
 */
export class FakePaymentGateway implements PaymentGateway {
  private readonly seen = new Map<string, ChargeResult>();

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const replayed = this.seen.get(request.idempotencyKey);

    if (replayed !== undefined) {
      return replayed;
    }

    const providerRef = `fake_${randomUUID()}`;
    const result: ChargeResult =
      request.amountSatang % 100 === 13
        ? { outcome: 'failed', providerRef, reason: 'Card declined'}
        : { outcome: 'succeeded', providerRef };

    this.seen.set(request.idempotencyKey, result);
    return result;
  }

  clear(): void {
    this.seen.clear();
  }
}