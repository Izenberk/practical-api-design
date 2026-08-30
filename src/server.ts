import express from 'express';
import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { app } from './app.js';

app.listen(env.PORT, () => {
  logger.info({
    message:'server listening',
    port:env.PORT,
    env:env.NODE_ENV,
  });
})