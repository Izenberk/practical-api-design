import type { UserRepository } from "../users/user.repository.js";
import type { User } from "../users/user.types.js";
import { hashPassword, verifyPassword } from "../users/password.js";
import { signAccessToken } from "./token.js";
import {
  ConflictError,
  UnauthorizedError,
} from "../../core/errors/app-error.js";

export interface AuthResult {
  readonly user: User;
  readonly accessToken: string;
}

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const existing = await this.users.findByEmail(email);;

    if (existing !== null) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.users.create({
      email,
      passwordHash,
      role: 'user',
    });

    return { user, accessToken: this.issue(user) }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const found = await this.users.findByEmail(email);

    if (found === null) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const matches = await verifyPassword(password, found.passwordHash);

    if (!matches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { passwordHash: _passwordHash, ...user } = found;

    return { user, accessToken: this.issue(user) };
  }

  private issue(user: User): string {
    return signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    })
  }
}