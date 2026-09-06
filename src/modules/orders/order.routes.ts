import { Router } from "express";
import { OrderController } from "./order.controller.js";
import { OrderService } from "./order.service.js";
import { container } from "../../core/container.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createOrderSchema,
  orderIdSchema,
  listOrderSchema,
  updateOrderStatusSchema,
} from "./order.schema.js";

const service = new OrderService(container.orders, container.products);
const controller = new OrderController(service);

export const orderRouter = Router();

orderRouter.post(
  '/',
  authenticate,
  validate(createOrderSchema),
  controller.create,
);

orderRouter.get(
  '/',
  authenticate,
  validate(listOrderSchema, 'query'),
  controller.list,
);

orderRouter.get(
  '/:id',
  authenticate,
  validate(orderIdSchema, 'params'),
  controller.getById,
);

orderRouter.put(
  '/:id/status',
  authenticate,
  validate(orderIdSchema, 'params'),
  validate(updateOrderStatusSchema),
  controller.updateStatus,
);

orderRouter.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(orderIdSchema, 'params'),
  controller.remove,
);