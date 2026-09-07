import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { PaymentService } from "./payment.service.js";
import { InMemoryPaymentRepository } from "./payment.repository.memory.js";
import { InMemoryOrderRepository } from "../orders/order.repository.memory.js";
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "../../core/errors/app-error.js";
import type { PaymentGateway, ChargeRequest, ChargeResult } from "./payment.gateway.js";
import type { Order } from "../orders/order.types.js";
import type { Requester } from "../users/user.types.js";

const KEYBOARD_SATANG = 289000;

const alice: Requester = { id: randomUUID(), role: 'user' };
const bob: Requester = { id: randomUUID(), role: 'user' };
const admin: Requester = { id: randomUUID(), role: 'admin' };

class StubGateway implements PaymentGateway {
  outcome: 'succeeded' | 'failed' = 'succeeded';
  readonly calls: ChargeRequest[] = [];

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    this.calls.push(request);

    return this.outcome === 'succeeded'
      ? { outcome: 'succeeded', providerRef: 'stub_ok' }
      : { outcome: 'failed', providerRef: 'stub_declined', reason: 'Card declined' };
  }
}

describe('PaymentService', () => {
  let payments: InMemoryPaymentRepository;
  let orders: InMemoryOrderRepository;
  let gateway: StubGateway;
  let service: PaymentService;

  const makeOrder = (userId: string): Promise<Order> =>
    orders.create({
      userId,
      items: [
        {
          productId: randomUUID(),
          name: 'Mechanical Keyboard',
          unitPriceSatang: KEYBOARD_SATANG,
          quantity: 1,
        },
      ],
      totalSatang: KEYBOARD_SATANG,
      currency: 'THB',
    });

  beforeEach(() => {
    payments = new InMemoryPaymentRepository();
    orders = new InMemoryOrderRepository();
    gateway = new StubGateway();
    service = new PaymentService(payments, orders, gateway);
  });

  describe('pay', () => {
    it('records a succeeded payment and moves the order to paid', async () => {
      const order = await makeOrder(alice.id);

      const payment = await service.pay(order.id, alice, 'key-1');

      expect(payment.status).toBe('succeeded');
      expect(payment.failureReason).toBeNull();
      expect(payment.orderId).toBe(order.id);
      expect(payment.userId).toBe(alice.id);
      expect(payment.amountSatang).toBe(KEYBOARD_SATANG);

      await expect(orders.findById(order.id)).resolves.toMatchObject({
        status: 'paid',
      });
    });

    it('records a decline without throwing, and leaves the order pending', async () => {
      gateway.outcome = 'failed';
      const order = await makeOrder(alice.id);

      const payment = await service.pay(order.id, alice, 'key-1');

      expect(payment.status).toBe('failed');
      expect(payment.failureReason).toBe('Card declined');

      await expect(orders.findById(order.id)).resolves.toMatchObject({
        status: 'pending',
      });
    });

    it('forwards the idempotency key and the order total to the gateway', async () => {
      const order = await makeOrder(alice.id);

      await service.pay(order.id, alice, 'key-1');

      expect(gateway.calls).toHaveLength(1);
      expect(gateway.calls[0]).toMatchObject({
        idempotencyKey: 'key-1',
        reference: order.id,
        amountSatang: KEYBOARD_SATANG,
        currency: 'THB',
      });
    });

    it('charges the order total, not a client-supplied amount', async () => {
      const order = await makeOrder(alice.id);

      const payment = await service.pay(order.id, alice, 'key-1');

      expect(payment.amountSatang).toBe(order.totalSatang);
    });

    it('reports an unknown order as NotFound', async () => {
      await expect(service.pay(randomUUID(), alice, 'key-1')).rejects.toThrow(
        NotFoundError,
      );
    });

    it("hides another user's order as NotFound, not Forbidden", async () => {
      const order = await makeOrder(alice.id);

      const error = await service
        .pay(order.id, bob, 'key-1')
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).not.toBeInstanceOf(ForbiddenError);
      expect(gateway.calls).toHaveLength(0);
    });

    it('lets an admin pay an order, crediting it to the owner', async () => {
      const order = await makeOrder(alice.id);

      const payment = await service.pay(order.id, admin, 'key-1');

      expect(payment.userId).toBe(alice.id);
    });

    it('rejects an order that is not pending with Conflict', async () => {
      const order = await makeOrder(alice.id);
      await orders.updateStatus(order.id, 'paid');

      await expect(service.pay(order.id, alice, 'key-2')).rejects.toThrow(
        ConflictError,
      );
      expect(gateway.calls).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('lets the owner read their payment', async () => {
      const order = await makeOrder(alice.id);
      const payment = await service.pay(order.id, alice, 'key-1');

      await expect(service.getById(payment.id, alice)).resolves.toMatchObject({
        id: payment.id,
      });
    });

    it('lets an admin read any payment', async () => {
      const order = await makeOrder(alice.id);
      const payment = await service.pay(order.id, alice, 'key-1');

      await expect(service.getById(payment.id, admin)).resolves.toMatchObject({
        id: payment.id,
      });
    });

    it("hides another user's payment as NotFound", async () => {
      const order = await makeOrder(alice.id);
      const payment = await service.pay(order.id, alice, 'key-1');

      await expect(service.getById(payment.id, bob)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('reports an unknown payment as NotFound', async () => {
      await expect(service.getById(randomUUID(), admin)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const first = await makeOrder(alice.id);
      const second = await makeOrder(alice.id);
      const third = await makeOrder(bob.id);

      await service.pay(first.id, alice, 'key-1');
      await service.pay(second.id, alice, 'key-2');
      await service.pay(third.id, bob, 'key-3');
    });

    it('shows a user only their own payments', async () => {
      const mine = await service.list({ limit: 10, offset: 0 }, alice);

      expect(mine).toHaveLength(2);
      expect(mine.every((payments) => payments.userId === alice.id)).toBe(true);
    });

    it('shows an admin every payment', async () => {
      const all = await service.list({ limit: 10, offset: 0 }, admin);

      expect(all).toHaveLength(3);
    });

    it('respects limit and offset', async () => {
      const page = await service.list({ limit: 2, offset: 0 }, admin);
      const next = await service.list({ limit: 2, offset: 2 }, admin);

      expect(page).toHaveLength(2);
      expect(next).toHaveLength(1);
    });
  });
});