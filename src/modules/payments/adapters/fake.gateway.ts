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
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const providerRef = `fake_${randomUUID()}`;

    if (request.amountSatang % 100 === 13) {
      return { outcome: 'failed', providerRef, reason: 'Card declined' };
    }

    return { outcome: 'succeeded', providerRef };
  }
}