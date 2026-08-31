import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../core/errors/app-error.js';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodType, source: Source = 'body'): RequestHandler =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(root)',
        message: issue.message,
      }));

      next(new ValidationError('Request validation failed', details));
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    } else {
      res.locals[source] = result.data;
    }

    next();
  }
