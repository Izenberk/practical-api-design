import { randomUUID } from "node:crypto";
import type { ListUsersOptions, UserRepository } from "./user.repository.js";
import type {
  User,
  UserWithSecret,
  CreateUserInput,
  UpdateUserInput,
} from './user.types.js';

const withoutSecret = (stored: UserWithSecret): User => {
  const { passwordHash: _passwordHash, ...user } = stored;
  return user;
};

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
    return withoutSecret(found);
  }

  async findAll(options: ListUsersOptions): Promise<User[]> {
    const all = [...this.items.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(withoutSecret);

    return all.slice(options.offset, options.offset + options.limit);
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

    return withoutSecret(stored);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const existing = this.items.get(id);
    if (existing === undefined) return null;

    const updated: UserWithSecret = {
      ...existing,
      ...(input.email !== undefined && { email: input.email }),
      ...(input.role !== undefined && { role: input.role }),
      updatedAt: new Date(),
    };

    this.items.set(id, updated);
    return withoutSecret(updated);
  };

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  clear(): void {
    this.items.clear();
  }
}