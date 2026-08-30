import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from './core/errors/app-error.js';
import { env } from './config/env.js';
import { logger } from './core/logger.js';

const app = express();

app.use((req, _res, next) => {
  req.id = randomUUID();
  next();
});

app.get('/', (_req, res) => {
  res.send('Welcome to typescript backend');
})

app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
})

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info({
    message:'server listening',
    port:env.PORT,
    env:env.NODE_ENV,
  });
})