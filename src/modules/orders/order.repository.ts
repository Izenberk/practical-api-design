import type { Order, OrderStatus, CreateOrderInput } from "./order.types.js";

export interface PageOptions {
  readonly limit: number;
  readonly offset: number;
}

export interface ListOrderOptions extends PageOptions {
  readonly userId?: string;
}

export interface OrderRepository {
  findAll(options: ListOrderOptions): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  create(input: CreateOrderInput): Promise<Order>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  delete(id: string): Promise<boolean>;
}