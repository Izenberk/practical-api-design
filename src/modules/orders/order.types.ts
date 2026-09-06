export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  readonly productId: string;
  readonly name: string;
  readonly unitPriceSatang: number;
  readonly quantity: number;
}

export interface Order {
  readonly id: string;
  readonly userId: string;
  readonly status:  OrderStatus;
  readonly items: readonly OrderItem[];
  readonly totalSatang: number;
  readonly currency: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateOrderInput {
  readonly userId: string;
  readonly items: readonly OrderItem[];
  readonly totalSatang: number;
  readonly currency: string;
}

export interface OrderLineInput {
  readonly productId: string;
  readonly quantity: number;
}