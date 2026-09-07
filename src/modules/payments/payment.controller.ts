import type { RequestHandler } from "express";
import type { PaymentService } from "./payment.service.js";
import type { PageOptions } from "./payment.repository.js";
import { requesterOf } from "../../middleware/authenticate.js";

interface CreatePaymentBody {
  readonly orderId: string;
}

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  pay: RequestHandler = async (req, res) => {
    const { orderId } = req.body as CreatePaymentBody;
    const idempotencyKey = res.locals.idempotencyKey as string;

    const payment = await this.service.pay(
      orderId,
      requesterOf(req),
      idempotencyKey,
  );

    res
      .status(201)
      .location(`/api/v1/payments/${payment.id}`)
      .json({ data: payment })
  };

  list: RequestHandler = async (req, res) => {
    const page = res.locals.query as PageOptions;
    const payments = await this.service.list(page, requesterOf(req));

    res.json({ data: payments });
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const payment = await this.service.getById(id, requesterOf(req));

    res.json({ data: payment });
  };
}