import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { app } from './app.js';
import { seedAdminUser } from './modules/users/user.seed.js';
import { container } from './core/container.js';

process.on('uncaughtException', (error: Error) => {
  logger.error({
    message: 'uncaughtException, shutting down',
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error({
    message: 'unhandledRejection, shutting down',
    stack: reason instanceof Error ? reason.stack : String(reason),
  });
  process.exit(1);
});

await seedAdminUser(container.users);

app.listen(env.PORT, () => {
  logger.info({
    message:'server listening',
    port:env.PORT,
    env:env.NODE_ENV,
  });
});