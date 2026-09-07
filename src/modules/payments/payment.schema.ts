import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.uuid(),
});

export const paymentIdSchema = z.object({
  id: z.uuid(),
});

export const listPaymentSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})