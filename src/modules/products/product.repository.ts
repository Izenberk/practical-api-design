import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
} from './product.types.js';

export interface ListProductsOptions {
  readonly limit: number;
  readonly offset: number;
  readonly includeInactive?: boolean;
}

export interface ProductRepository {
  findAll(options: ListProductsOptions): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}