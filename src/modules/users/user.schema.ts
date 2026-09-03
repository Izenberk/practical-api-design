import { z } from 'zod';
import { normalizeEmail } from './email.js';
import { USER_ROLES } from './user.types.js'

export const registerSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password: z.string().min(1),
});

export const userIdSchema = z.object({
  id: z.uuid(),
});

export const listUsersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const updateUserSchema = z
  .object({
    email: z.string().transform(normalizeEmail).pipe(z.email()).optional(),
    role: z.enum(USER_ROLES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: 'At least one field must be provided',
  });