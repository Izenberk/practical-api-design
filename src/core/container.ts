import { InMemoryUserRepository } from "../modules/users/user.repository.memory.js";
import { InMemoryProductRepository } from "../modules/products/product.repository.memory.js";
import { InMemoryOrderRepository } from "../modules/orders/order.repository.memory.js";
import { InMemoryIdempotencyStore } from "./idempotency/idempotency.store.memory.js";
import { InMemoryPaymentRepository } from "../modules/payments/payment.repository.memory.js";
import { FakePaymentGateway } from "../modules/payments/adapters/fake.gateway.js";
import type { UserRepository } from "../modules/users/user.repository.js";
import type { ProductRepository } from "../modules/products/product.repository.js";
import type { OrderRepository } from "../modules/orders/order.repository.js";
import type { IdempotencyStore } from "./idempotency/idempotency.store.js";
import type { PaymentRepository } from "../modules/payments/payment.repository.js";
import type { PaymentGateway } from "../modules/payments/payment.gateway.js";

export interface Container {
  readonly users: UserRepository;
  readonly products: ProductRepository;
  readonly orders: OrderRepository;
  readonly idempotency: IdempotencyStore;
  readonly payments: PaymentRepository;
  readonly gateway: PaymentGateway;
}

// Concrete instances, kept private. The exported `container` narrows these to
// interfaces so application code cannot reach clear(); this module can.
const instances = {
  users: new InMemoryUserRepository(),
  products: new InMemoryProductRepository(),
  orders: new InMemoryOrderRepository(),
  idempotency: new InMemoryIdempotencyStore(),
  payments: new InMemoryPaymentRepository(),
  gateway: new FakePaymentGateway(),
};

export const container: Container = instances;

/** Test-only. Empties every in-memory store without replacing the instances */
export const resetContainer = (): void => {
  instances.users.clear();
  instances.products.clear();
  instances.orders.clear();
  instances.idempotency.clear();
};