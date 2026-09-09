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
import type { CacheStore } from '../../core/cache/cache.port.js';

const LIST_PREFIX = 'products:list';

const listKey = (options: ListProductsOptions): string =>
  `${LIST_PREFIX}limit=${options.limit}:offset=${options.offset}` +
  `:inactive=${options.includeInactive === true}`;

export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly cache: CacheStore,
  ) {}

  async list(options: ListProductsOptions): Promise<Product[]> {
    const key = listKey(options);
    const cached = await this.cache.get<Product[]>(key);

    if (cached !== null) {
      return cached;
    }

    const products = await this.repository.findAll(options);
    await this.cache.set(key, products);

    return products;
  }

  async getById(id: string): Promise<Product> {
    const product = await this.repository.findById(id);

    if (product === null) {
      throw new NotFoundError(`Product ${id} not found`);
    }

    return product;
  }

  async create(input: CreateProductInput): Promise<Product> {
    const product = await this.repository.create(input);
    await this.cache.invalidatePrefix(LIST_PREFIX);

    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const updated = await this.repository.update(id, input);

    if (updated === null) {
      throw new NotFoundError(`Product ${id} not found`);
    }

    await this.cache.invalidatePrefix(LIST_PREFIX);

    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new NotFoundError(`Product ${id} not found`);
    }

    await this.cache.invalidatePrefix(LIST_PREFIX);
  }
}