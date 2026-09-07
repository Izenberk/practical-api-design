import { Router } from "express";
import { PaymentController } from "./payment.controller.js";
import { PaymentService } from "./payment.service.js";
import { container } from "../../core/container.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { idempotency } from "../../middleware/idempotency.js";
import {
  createPaymentSchema,
  paymentIdSchema,
  listPaymentSchema,
} from "./payment.schema.js"

const service = new PaymentService(
  container.payments,
  container.orders,
  container.gateway,
);
const controller = new PaymentController(service);

export const paymentRouter = Router();

paymentRouter.post(
  '/',
  authenticate,
  validate(createPaymentSchema),
  idempotency(container.idempotency),
  controller.pay,
);

paymentRouter.get(
  '/',
  authenticate,
  validate(listPaymentSchema, 'query'),
  controller.list,
);

paymentRouter.get(
  '/:id',
  authenticate,
  validate(paymentIdSchema, 'params'),
  controller.getById,
);