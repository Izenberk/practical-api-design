import type { RequestHandler } from "express";
import type { PaymentService } from "./payment.service.js";
import type { ListPaymentOptions } from "./payment.repository.js";
import { requesterOf } from "../../middleware/authenticate.js";

interface CreatePaymentBody {
  readonly orderId: string;
}

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  pay: RequestHandler = async (req, res) => {
    const { orderId } = req.body as CreatePaymentBody;
    const payment = await this.service.pay(orderId, requesterOf(req));

    res
      .status(201)
      .location(`/api/v1/payment/${payment.id}`)
      .json({ data: payment })
  };

  list: RequestHandler = async (req, res) => {
    const requester = requesterOf(req);
    const page = res.locals.query as ListPaymentOptions;

    const options: ListPaymentOptions = 
      requester.role === 'admin' ? page : { ...page, userId: requester.id };

    res.json({ data: await this.service.list(options) });
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const payment = await this.service.getById(id, requesterOf(req));

    res.json({ data: payment });
  };
}