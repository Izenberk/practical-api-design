import { z } from 'zod';
import { normalizeEmail } from './email.js';

export const registerSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password: z.string().min(1),
});