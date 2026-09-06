import { z } from "zod";
import { ORDER_STATUSES } from "./order.types.js";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      { error: 'Each product may appear only once' },
    ),
});

export const orderIdSchema = z.object({
  id: z.uuid(),
});

export const listOrderSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});