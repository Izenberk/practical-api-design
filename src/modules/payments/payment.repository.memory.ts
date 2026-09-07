import { randomUUID } from "node:crypto";
import type {
  PaymentRepository,
  ListPaymentOptions,
} from "./payment.repository.js";
import type { Payment, CreatePaymentInput } from "./payment.types.js"

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly items = new Map<string, Payment>();

  async findAll(options: ListPaymentOptions): Promise<Payment[]> {
    const all = [...this.items.values()]
      .filter(
        (p) => options.userId === undefined || p.userId === options.userId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return all.slice(options.offset, options.offset + options.limit);
  }

  async findById(id: string): Promise<Payment | null> {
    return this.items.get(id) ?? null;
  }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const payment: Payment = {
      id: randomUUID(),
      orderId: input.orderId,
      userId: input.userId,
      amountSatang: input.amountSatang,
      currency: input.currency,
      status: input.status,
      failureReason: input.failureReason,
      providerRef: input.providerRef,
      createdAt: new Date(),
    };

    this.items.set(payment.id, payment);
    return payment;
  }

  clear(): void {
    this.items.clear();
  }
};