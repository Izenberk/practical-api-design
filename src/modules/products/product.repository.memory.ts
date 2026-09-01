import { randomUUID } from "node:crypto";
import type {
  ProductRepository,
  ListProductsOptions
} from './product.repository.js';
import type {
  Product,
  CreateProductInput,
  UpdateProductInput
} from './product.types.js';

export class InMemoryProductRepository implements ProductRepository {
  private readonly items = new Map<string, Product>();

  async findAll(options: ListProductsOptions): Promise<Product[]> {
    const all = [...this.items.values()]
      .filter((p) => options.includeInactive === true || p.isActive)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return all.slice(options.offset, options.offset + options.limit);
  }

  async findById(id: string): Promise<Product | null> {
    return this.items.get(id) ?? null;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const now = new Date();

    const product: Product = {
      id: randomUUID(),
      name: input.name,
      description: input.description ?? null,
      priceSatang: input.priceSatang,
      currency: input.currency ?? 'THB',
      stock: input.stock ?? 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(product.id, product);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const existing = this.items.get(id);
    if (existing === undefined) return null;

    const updated: Product = {
      ...existing,
      ...(input.name !== undefined && {name: input.name }),
      ...(input.description != undefined && {
        description: input.description,
      }),
      ...(input.priceSatang !== undefined && { priceSatang: input.priceSatang }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.stock !== undefined && { stock: input.stock }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      updatedAt: new Date(),
    };

    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id)
  }

  clear(): void {
    this.items.clear();
  }
}