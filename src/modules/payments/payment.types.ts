export const PAYMENT_STATUSES = ['succeeded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Payment {
  readonly id: string;
  readonly orderId: string;
  readonly userId: string;
  readonly amountSatang: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly providerRef: string;
  readonly createdAt: Date;
}

export interface CreatePaymentInput {
  readonly orderId: string;
  readonly userId: string;
  readonly amountSatang: number;
  readonly currency: string;
  readonly status: PaymentStatus;
  readonly providerRef: string;
}