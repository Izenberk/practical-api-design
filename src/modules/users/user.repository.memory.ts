import { randomUUID } from "node:crypto";
import type { UserRepository } from "./user.repository.js";
import type { User, UserWithSecret, CreateUserInput } from './user.types.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, UserWithSecret>();

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    for (const user of this.items.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    const found = this.items.get(id);
    if (found === undefined) return null;

    const { passwordHash: _passwordHash, ...user } = found
    return user
  }

  async create(input: CreateUserInput): Promise<User> {
    const now = new Date();

    const stored: UserWithSecret = {
      id: randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(stored.id, stored);

    const { passwordHash: _passwordHash, ...user } = stored;
    return user;
  }

  clear(): void {
    this.items.clear();
  }
}