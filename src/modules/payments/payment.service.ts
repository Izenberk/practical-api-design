import type { PaymentRepository, ListPaymentOptions, PageOptions } from "./payment.repository.js";
import type { OrderRepository } from "../orders/order.repository.js";
import type { PaymentGateway } from "./payment.gateway.js";
import type { Payment } from "./payment.types.js";
import type { Requester } from "../users/user.types.js";
import {
  ConflictError,
  NotFoundError,
} from "../../core/errors/app-error.js"

export class PaymentService {
  constructor(
    private readonly payment: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly gateway: PaymentGateway,
  ) {}

  async pay(orderId: string, requester: Requester, idempotencyKey: string): Promise<Payment> {
    const order = await this.orders.findById(orderId);

    // Same reasoning as OrderService: a 403 here would confirm that an
    // order with this id exists.
    if (order === null || (requester.role !== 'admin' && order.userId !== requester.id)) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }

    if (order.status !== 'pending') {
      throw new ConflictError(
        `Order ${orderId} is ${order.status} and cannot be paid`,
      );
    }

    const result = await this.gateway.charge({
      amountSatang: order.totalSatang,
      currency: order.currency,
      reference: order.id,
      idempotencyKey,
    });

    const payment = await this.payment.create({
      orderId: order.id,
      userId: order.userId,
      amountSatang: order.totalSatang,
      currency: order.currency,
      status: result.outcome,
      failureReason: result.outcome === 'failed' ? result.reason: null,
      providerRef: result.providerRef,
    });

    if (result.outcome === 'succeeded') {
      // System-triggered transition. The state table governs manual admin
      // changes; a settled charge has already earned pending -> paid.
      await this.orders.updateStatus(order.id, 'paid');
    }

    return payment;
  }

  async list(page: PageOptions, requester: Requester): Promise<Payment[]> {
    const options: ListPaymentOptions = {
      ...page,
      ...(requester.role !== 'admin' && { userId: requester.id }),
    };

    return this.payment.findAll(options);
  }

  async getById(id: string, requester: Requester): Promise<Payment> {
    const payment = await this.payment.findById(id)

    if (
      payment === null ||
      (requester.role !== 'admin' && payment.userId !== requester.id)
    ) {
      throw new NotFoundError(`Payment ${id} not found`);
    }

    return payment;
  }
}