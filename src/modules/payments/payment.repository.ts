import type { Payment, CreatePaymentInput } from "./payment.types.js";

export interface PageOptions {
  readonly limit: number;
  readonly offset: number;
}

export interface ListPaymentOptions extends PageOptions {
  readonly userId?: string;
}

export interface PaymentRepository {
  findAll(options: ListPaymentOptions): Promise<Payment[]>;
  findById(id: string): Promise<Payment | null>;
  create(input: CreatePaymentInput): Promise<Payment>;
}