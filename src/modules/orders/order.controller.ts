import type { RequestHandler } from "express";
import type { OrderService } from "./order.service.js";
import type { PageOptions } from "./order.repository.js";
import type { OrderLineInput, OrderStatus } from "./order.types.js";
import { requesterOf } from "../../middleware/authenticate.js";

interface CreateOrderBody {
  readonly items: readonly OrderLineInput[];
}

interface UpdateStatusBody {
  readonly status: OrderStatus;
}

export class OrderController {
  constructor(private readonly service: OrderService) {}

  create: RequestHandler = async (req, res) => {
    const { items } = req.body as CreateOrderBody;
    const order = await this.service.create(items, requesterOf(req));

    res.status(201).location(`/api/v1/orders/${order.id}`).json({
      data: order,
    });
  };

  list: RequestHandler = async (req, res) => {
    const page = res.locals.query as PageOptions;
    const orders = await this.service.list(page, requesterOf(req));

    res.json({ data: orders })
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const order = await this.service.getById(id, requesterOf(req));

    res.json({ data: order });
  };

  updateStatus: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const { status } = req.body as UpdateStatusBody;
    const order = await this.service.updateStatus(
      id,
      status,
      requesterOf(req),
    );

    res.json({ data: order })
  };

  remove: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    await this.service.remove(id, requesterOf(req));

    res.status(204).send();
  };
}