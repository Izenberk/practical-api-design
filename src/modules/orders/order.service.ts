import type {
  OrderRepository,
  ListOrderOptions,
  PageOptions,
} from "./order.repository.js";
import type { ProductRepository } from "../products/product.repository.js";
import type {
  Order,
  OrderItem,
  OrderStatus,
  OrderLineInput,
} from "./order.types.js";
import type { Requester } from "../users/user.types.js";
import { findTransition } from "./order.state.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../core/errors/app-error.js"
import type { CacheStore } from "../../core/cache/cache.port.js";

export const ORDER_LIST_PREFIX = 'orders:list:';

/**
 * The requester is part of the key, not just the filter. An orders page is a
 * different result set for every user, so a key built from pagination alone
 * would serve one user's orders to the next caller that asks for page 1.
 * Admins all see everything, so they share one 'admin' scope.
 */
const listKey = (page: PageOptions, requester: Requester): string =>
  `${ORDER_LIST_PREFIX}scope=${requester.role === 'admin' ? 'admin' : requester.id}` +
  `:limit=${page.limit}:offset=${page.offset}`;

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly cache: CacheStore,
  ) {}

  async create(
    lines: readonly OrderLineInput[],
    requester: Requester,
  ): Promise<Order> {
    const items: OrderItem[] = [];
    let totalSatang = 0;
    let currency: string | undefined;

    for (const line of lines) {
      const product = await this.products.findById(line.productId);

      if (product === null || !product.isActive) {
        throw new ValidationError('Order contains as unavailable product', [
          {
            field: 'items',
            message: `Product ${line.productId} is not available`,
          },
        ]);
      }

      currency ??= product.currency;

      if (currency !== product.currency) {
        throw new ValidationError('All items must share one currency', [
          { field: 'items', message: `Expected ${currency}` },
        ]);
      }

      items.push({
        productId: product.id,
        name: product.name,
        unitPriceSatang: product.priceSatang,
        quantity: line.quantity,
      });

      totalSatang += product.priceSatang * line.quantity;
    }

    if (currency === undefined) {
      throw new ValidationError('An order must contain at least one item');
    }

    const order = await this.orders.create({
      userId: requester.id,
      items,
      totalSatang,
      currency,
    });

    await this.cache.invalidatePrefix(ORDER_LIST_PREFIX);

    return order;
  }

  async list(page: PageOptions, requester: Requester): Promise<Order[]> {
    const key = listKey(page, requester);
    const cached = await this.cache.get<Order[]>(key);

    if (cached !== null) {
      return cached;
    }

    const options: ListOrderOptions = {
      ...page,
      ...(requester.role !== 'admin' && { userId: requester.id }),
    };

    const orders = await this.orders.findAll(options);
    await this.cache.set(key, orders);

    return orders;
  }

  async getById(id: string, requester: Requester): Promise<Order> {
    const order = await this.orders.findById(id);

    if (order === null) {
      throw new NotFoundError(`Order ${id} not found`);
    }

    this.assertVisibleTo(order, requester);

    return order;
  }

  async updateStatus(
    id: string,
    next: OrderStatus,
    requester: Requester,
  ): Promise<Order> {
    const order = await this.getById(id, requester);

    const transition = findTransition(order.status, next);

    if (transition === undefined) {
      throw new ConflictError(
        `Cannot change an order from ${order.status} to ${next}`,
      );
    }

    const byRole = transition.allowedRoles.includes(requester.role);
    const byOwner =
      transition.ownerMayTrigger && order.userId === requester.id;

    if (!byRole && !byOwner) {
      throw new ForbiddenError(`You may not change an order to ${next}`);
    }

    const updated = await this.orders.updateStatus(id, next);

    if (updated === null) {
      throw new NotFoundError(`Order ${id} not found`);
    }

    await this.cache.invalidatePrefix(ORDER_LIST_PREFIX);

    return updated;
  }

  async remove(id: string, requester: Requester): Promise<void> {
    if (requester.role !== 'admin') {
      throw new ForbiddenError('Only an admin may delete an order');
    }

    const deleted = await this.orders.delete(id);

    if (!deleted) {
      throw new NotFoundError(`Order ${id} not found`);
    }

    await this.cache.invalidatePrefix(ORDER_LIST_PREFIX);
  }

  private assertVisibleTo(order: Order, requester: Requester): void {
    if (requester.role === 'admin') return;
    if (order.userId === requester.id) return;

    // NotFound, not Forbidden: a 403 here would confirm the order exists.
    throw new NotFoundError(`Order ${order.id} not found`);
  }
}