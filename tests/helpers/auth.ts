import { container, resetContainer } from "../../src/core/container.js";
import { hashPassword } from "../../src/modules/users/password.js";
import { signAccessToken } from "../../src/modules/auth/token.js";
import type { User, UserRole } from "../../src/modules/users/user.types.js";

export interface Actor {
  readonly user: User;
  readonly token: string;
  readonly header: readonly [string, string];
}

export const createActor = async (
  email: string,
  role: UserRole,
): Promise<Actor> => {
  const user = await container.users.create({
    email,
    passwordHash: await hashPassword('hunter2hunter2'),
    role,
  });

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token, header: ['Authorization', `Bearer ${token}`] };
};

export { resetContainer };