import type { PaymentRepository, ListPaymentOptions } from "./payment.repository.js";
import type { OrderRepository } from "../orders/order.repository.js";
import type { PaymentGateway } from "./payment.gateway.js";
import type { Payment } from "./payment.types.js";
import type { Requester } from "../users/user.types.js";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "../../core/errors/app-error.js"

export class PaymentService {
  constructor(
    private readonly payment: PaymentRepository,
    private readonly orders: OrderRepository,
    private readonly gateway: PaymentGateway,
  ) {}

  async pay(orderId: string, requester: Requester): Promise<Payment> {
    const order = await this.orders.findById(orderId);

    // Same reasoning as OrderService: a 403 here would confirm that an
    // order with this id exists.
    if (order === null || (requester.role !== 'admin' && order.userId !== requester.id)) {
      throw new NotFoundError(`Order ${orderId} not found`);
    }

    if (order.status !== 'pending') {
      throw new ConflictError(
        `Order ${orderId} is ${order.status} abd cannot be paid`,
      );
    }

    const result = await this.gateway.charge({
      amountSatang: order.totalSatang,
      currency: order.currency,
      reference: order.id,
    });

    const payment = await this.payment.create({
      orderId: order.id,
      userId: order.userId,
      amountSatang: order.totalSatang,
      currency: order.currency,
      status: result.outcome,
      providerRef: result.providerRef,
    });

    if (result.outcome === 'failed') {
      throw new BadRequestError(`Payment declined: ${result.reason}`);
    }

    // System-triggered transition. The state table governs manual admin
    // changes; a settled charge has already earned pending -> paid.
    await this.orders.updateStatus(order.id, 'paid');

    return payment;
  }

  async list(options: ListPaymentOptions): Promise<Payment[]> {
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