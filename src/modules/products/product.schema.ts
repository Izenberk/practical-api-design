import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullish(),
  priceSatang: z.number().int().nonnegative(),
  currency: z.string().length(3).toUpperCase().default('THB'),
  stock: z.number().int().nonnegative().default(0),
});

export const updateProductSchema = createProductSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

  export const productIdSchema = z.object({
    id: z.uuid(),
  });

  export const listProductsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().nonnegative().default(0),
  });