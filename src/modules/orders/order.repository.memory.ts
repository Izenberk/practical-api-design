import { randomUUID } from "node:crypto";
import type { OrderRepository, ListOrderOptions } from "./order.repository.js";
import type { Order, OrderStatus, CreateOrderInput } from "./order.types.js";

export class InMemoryOrderRepository implements OrderRepository {
  private readonly items = new Map<string, Order>();

  async findAll(options: ListOrderOptions): Promise<Order[]> {
    const all = [...this.items.values()]
      .filter(
        (order) =>
          options.userId === undefined || order.userId === options.userId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return all.slice(options.offset, options.offset + options.limit);
  }

  async findById(id: string): Promise<Order | null> {
    return this.items.get(id) ?? null;
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const now = new Date();

    const order: Order = {
      id: randomUUID(),
      userId: input.userId,
      status: 'pending',
      items: input.items,
      totalSatang: input.totalSatang,
      currency: input.currency,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(order.id, order);
    return order;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const existing = this.items.get(id);
    if (existing === undefined) return null;

    const updated: Order = { ...existing, status, updatedAt: new Date() };

    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }
}