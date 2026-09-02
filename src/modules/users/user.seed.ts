import type { UserRepository } from "./user.repository.js";
import { hashPassword } from "./password.js";
import { registerSchema } from "./user.schema.js";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";

export const seedAdminUser = async (users: UserRepository): Promise<void> => {
  if (env.ADMIN_EMAIL === null || env.ADMIN_PASSWORD === null) {
    logger.warn({
      message: 'admin seed skipped',
      reason: 'ADMIN_EMAIL or ADMIN_PASSWORD not set',
    });
    return;
  }

  const parsed = registerSchema.safeParse({
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid admin seed credentials — ${detail}`);
  }

  const { email, password } = parsed.data;
  const existing = await users.findByEmail(email);

  if (existing !== null) {
    logger.info({ message: 'admin seed skipped', reason: 'already exists', email });
    return;
  }

  const passwordHash = await hashPassword(password);
  const admin = await users.create({ email, passwordHash, role: 'admin' })
  logger.info({ message: 'admin user seeded', id: admin.id, email: admin.email });
};