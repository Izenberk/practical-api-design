import type { Payment, CreatePaymentInput } from "./payment.types.js";

export interface ListPaymentOptions {
  readonly limit: number;
  readonly offset: number;
  readonly userId?: string;
}

export interface PaymentRepository {
  findAll(options: ListPaymentOptions): Promise<Payment[]>;
  findById(id: string): Promise<Payment | null>;
  create(input: CreatePaymentInput): Promise<Payment>;
}