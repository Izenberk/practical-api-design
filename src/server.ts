import { env } from './config/env.js';
import { logger } from './core/logger.js';
import { app } from './app.js';
import { seedAdminUser } from './modules/users/user.seed.js';
import { container } from './core/container.js';

await seedAdminUser(container.users);

app.listen(env.PORT, () => {
  logger.info({
    message:'server listening',
    port:env.PORT,
    env:env.NODE_ENV,
  });
});