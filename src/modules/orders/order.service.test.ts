import { describe, it, expect, beforeEach } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { OrderService } from "./order.service.js";
import { InMemoryOrderRepository } from "./order.repository.memory.js";
import { InMemoryProductRepository } from "../products/product.repository.memory.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../core/errors/app-error.js";
import type { Product } from "../products/product.types.js";
import type { Requester } from "../users/user.types.js";

const KEYBOARD_SATANG = 289000;

const alice: Requester = { id: randomUUID(), role: 'user' };
const bob: Requester = { id: randomUUID(), role: 'user' };
const admin: Requester = { id: randomUUID(), role: 'admin' };

describe('OrderService', () => {
  let orders: InMemoryOrderRepository;
  let products: InMemoryProductRepository;
  let service: OrderService;
  let keyboard: Product;

  beforeEach(async () => {
    orders = new InMemoryOrderRepository();
    products = new InMemoryProductRepository();
    service = new OrderService(orders, products);

    keyboard = await products.create({
      name: 'Mechanical Keyboard',
      priceSatang: KEYBOARD_SATANG,
    });
  });

  describe('create', () => {
    it('starts pending, owned by the requester', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 2 }],
        alice,
      );

      expect(order.status).toBe('pending');
      expect(order.userId).toBe(alice.id);
    });

    it('snapshots the name and unit price, and computes the total', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 2 }],
        alice,
      );

      expect(order.items).toHaveLength(1);
      expect(order.items[0]?.name).toBe('Mechanical Keyboard');
      expect(order.items[0]?.unitPriceSatang).toBe(KEYBOARD_SATANG);
      expect(order.totalSatang).toBe(KEYBOARD_SATANG * 2);
      expect(order.currency).toBe('THB');
    });

    it('keeps the snapshot when the product price changes later', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 2}],
        alice,
      );

      await products.update(keyboard.id, { priceSatang: 100 });

      const reloaded = await service.getById(order.id, alice);

      expect(reloaded.items[0]?.unitPriceSatang).toBe(KEYBOARD_SATANG);
      expect(reloaded.totalSatang).toBe(KEYBOARD_SATANG * 2);
    });

    it('rejects an unknown product', async () => {
      await expect(
        service.create([{ productId: randomUUID(), quantity: 1 }], alice),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects an inactive product', async () => {
      await products.update(keyboard.id, { isActive: false });

      await expect(
        service.create([{ productId: keyboard.id, quantity: 1 }], alice),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects an order with no items', async () => {
      await expect(service.create([], alice)).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('lets the owner read their order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      await expect(service.getById(order.id, alice)).resolves.toMatchObject({
        id: order.id,
      });
    });

    it('lets an admin read any order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      await expect(service.getById(order.id, admin)).resolves.toMatchObject({
        id: order.id,
      });
    });

    it("hides another user's order as NotFound, not Forbidden", async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      const error = await service
        .getById(order.id, bob)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).not.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await service.create([{ productId: keyboard.id, quantity: 1 }], alice);
      await service.create([{ productId: keyboard.id, quantity: 1 }], alice);
      await service.create([{ productId: keyboard.id, quantity: 1 }], bob);
    });

    it('shows a user only their own orders', async () => {
      const mine = await service.list({ limit: 10, offset: 0 }, alice);

      expect(mine).toHaveLength(2);
      expect(mine.every((order) => order.userId === alice.id)).toBe(true);
    });

    it('shows an admin every order', async () => {
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

  describe('updateStatus', () => {
    it('lets an admin move pending to paid', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      const updated = await service.updateStatus(order.id, 'paid', admin);

      expect(updated.status).toBe('paid');
    });

    it('lets the owner cancel a pending order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice
      );
      const updated = await service.updateStatus(order.id, 'cancelled', alice);

      expect(updated.status).toBe('cancelled');
    })

    it('forbids the owner from shipping their own paid order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice
      );
      await service.updateStatus(order.id, 'paid', admin);

      await expect(
        service.updateStatus(order.id, 'shipped', alice),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects an illegal transition with Conflict, even for an admin', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      await expect(
        service.updateStatus(order.id, 'delivered', admin),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects cancelling a paid order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );
      await service.updateStatus(order.id, 'paid', admin);

      await expect(
        service.updateStatus(order.id, 'cancelled', alice),
      ).rejects.toThrow(ConflictError);
    });

    it("hides another user's order from a status change", async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      await expect(
        service.updateStatus(order.id, 'cancelled', bob),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('lets an admin delete an order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      await service.remove(order.id, admin);

      await expect(orders.findById(order.id)).resolves.toBeNull();
    });

    it('forbids a user from deleting their own order', async () => {
      const order = await service.create(
        [{ productId: keyboard.id, quantity: 1 }],
        alice,
      );

      await expect(service.remove(order.id, alice)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('reports an unknown order as NotFound', async () => {
      await expect(service.remove(randomUUID(), admin)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});