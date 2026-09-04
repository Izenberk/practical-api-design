import type { UserRepository, ListUsersOptions } from "./user.repository.js";
import type { User, UpdateUserInput, Requester } from "./user.types.js";
import { normalizeEmail } from "./email.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async list(options: ListUsersOptions): Promise<User[]> {
    return this.users.findAll(options);
  }

  async getById(id: string, requester: Requester): Promise<User> {
    this.assertSelfOrAdmin(id, requester);

    const user = await this.users.findById(id);

    if (user === null) {
      throw new NotFoundError(`User ${id} not found`)
    }

    return user;
  }

  async update(
    id: string,
    input: UpdateUserInput,
    requester: Requester,
  ): Promise<User> {
    this.assertSelfOrAdmin(id, requester);

    if (input.role !== undefined && requester.role !== 'admin') {
      throw new ForbiddenError('Only an admin may change a role');
    }

    const patch: UpdateUserInput = {
      ...input,
      ...(input.email !== undefined && { email: normalizeEmail(input.email) }),
    };

    if (patch.email != undefined) {
      const owner = await this.users.findByEmail(patch.email);

      if (owner !== null && owner.id !== id) {
        throw new ConflictError('Email already registered');
      }
    }

    const updated = await this.users.update(id, patch);

    if (updated == null) {
      throw new NotFoundError(`User ${id} not found`);
    }

    return updated;
  }

  async remove(id: string, requester: Requester): Promise<void> {
    this.assertSelfOrAdmin(id, requester);

    const deleted = await this.users.delete(id);

    if (!deleted) {
      throw new NotFoundError(`User ${id} not found`)
    }
  }

  private assertSelfOrAdmin(id: string, requester: Requester): void {
    if (requester.role === 'admin') return;
    if (requester.id === id) return;

    throw new ForbiddenError('You may only access your own account')
  }
}