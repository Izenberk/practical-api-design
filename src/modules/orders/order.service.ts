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

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
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

    return this.orders.create({
      userId: requester.id,
      items,
      totalSatang,
      currency,
    });
  }

  async list(page: PageOptions, requester: Requester): Promise<Order[]> {
    const options: ListOrderOptions = {
    ...page,
    ...(requester.role !== 'admin' && { userId: requester.id }),
    };

    return this.orders.findAll(options);
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
  }

  private assertVisibleTo(order: Order, requester: Requester): void {
    if (requester.role === 'admin') return;
    if (order.userId === requester.id) return;

    // NotFound, not Forbidden: a 403 here would confirm the order exists.
    throw new NotFoundError(`Order ${order.id} not found`);
  }
}