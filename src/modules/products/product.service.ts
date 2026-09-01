import type {
  ProductRepository,
  ListProductsOptions
} from './product.repository.js';

import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from './product.types.js';
import { NotFoundError } from '../../core/errors/app-error.js';

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async list(options: ListProductsOptions): Promise<Product[]> {
    return this.repository.findAll(options);
  }

  async getById(id: string): Promise<Product> {
    const product = await this.repository.findById(id);

    if (product === null) {
      throw new NotFoundError(`Product ${id} not found`);
    }

    return product;
  }

  async create(input: CreateProductInput): Promise<Product> {
    return this.repository.create(input);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const updated = await this.repository.update(id, input);

    if (updated === null) {
      throw new NotFoundError(`Product ${id} not found`);
    }

    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new NotFoundError(`Product ${id} not found`);
    }
  }
}