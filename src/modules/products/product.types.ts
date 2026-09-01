export interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly priceSatang: number;
  readonly currency: string;
  readonly stock: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProductInput {
  readonly name: string;
  readonly description?: string | null;
  readonly priceSatang: number;
  readonly currency?: string;
  readonly stock?: number;
}

export type UpdateProductInput = Partial<CreateProductInput> & {
  readonly isActive?: boolean;
};