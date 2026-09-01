import express from 'express'
import helmet from 'helmet';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { randomUUID } from 'node:crypto';
import { requestLogger } from './middleware/request-logger.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { NotFoundError } from './core/errors/app-error.js';
import { healthRouter } from './routes/health.js';
import { v1Router } from './routes/v1.js';

export const app = express();

app.use(helmet());
app.use(cors());

app.use((req, _res, next) => {
  req.id = randomUUID();
  next();
});

app.use(requestLogger);
app.use(rateLimiter)
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Welcome to typescript backend');
})

app.use('/health', healthRouter);
app.use('/api/v1', v1Router);

app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
})

app.use(errorHandler)