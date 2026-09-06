import { InMemoryProductRepository } from "../modules/products/product.repository.memory.js";
import { InMemoryUserRepository } from "../modules/users/user.repository.memory.js";
import type { UserRepository } from "../modules/users/user.repository.js";
import type { ProductRepository } from "../modules/products/product.repository.js";
import type { OrderRepository } from "../modules/orders/order.repository.js";
import { InMemoryOrderRepository } from "../modules/orders/order.repository.memory.js";

export interface Container {
  readonly users: UserRepository;
  readonly products: ProductRepository;
  readonly orders: OrderRepository;
}

export const container: Container = {
  users: new InMemoryUserRepository(),
  products: new InMemoryProductRepository(),
  orders: new InMemoryOrderRepository(),
};