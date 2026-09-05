import { describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import { UserService } from "./user.service.js";
import { InMemoryUserRepository } from "./user.repository.memory.js";
import { hashPassword } from "./password.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors/app-error.js";
import type { User, Requester, UserRole } from "./user.types.js";

let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword('hunter2hunter2');
})

const seed = async (
  users: InMemoryUserRepository,
  email: string,
  role: UserRole
): Promise<User> => users.create({
  email,
  passwordHash,
  role,
});

const requesterFor = (user: User): Requester => ({
  id: user.id,
  role: user.role,
});

describe('UserService', () => {
  let users: InMemoryUserRepository;
  let service: UserService;
  let admin: User;
  let alice: User;
  let bob: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    service = new UserService(users);

    admin = await seed(users, 'admin@example.com', 'admin');
    alice = await seed(users, 'alice@example.com', 'user');
    bob = await seed(users, 'bob@example.com', 'user');
  });

  describe('getById', () => {
    it('lets a user read their own record', async () => {
      const found = await service.getById(alice.id, requesterFor(alice));

      expect(found.id).toBe(alice.id);
      expect(found).not.toHaveProperty('passwordHash');
    });

    it('lets admin read any record', async () => {
      const found = await service.getById(alice.id, requesterFor(admin));

      expect(found.id).toBe(alice.id);
    });

    it('forbids a user from reading another record', async () => {
      await expect(
        service.getById(bob.id, requesterFor(alice)),
      ).rejects.toThrow(ForbiddenError);
    });

    it('gives 403 not 404 for an unknown id, so it is not an existence oracle', async () => {
      const unknown = '99999999-9999-4999-8999-999999999999';

      await expect(
        service.getById(unknown, requesterFor(alice)),
      ).rejects.toThrow(ForbiddenError);
    });

    it('still give 404 to an admin for an unknown id', async () => {
      const unknown = '99999999-9999-4999-8999-999999999999';

      await expect(
        service.getById(unknown, requesterFor(admin)),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('lets a user change their own email', async () => {
      const updated = await service.update(
        alice.id,
        { email: 'Alice.New@Example.com' },
        requesterFor(alice),
      );

      expect(updated.email).toBe('alice.new@example.com');
      expect(updated.role).toBe('user');
    });

    it('forbids a user from self-elevating to admin', async () => {
      await expect(
        service.update(alice.id, { role: 'admin' }, requesterFor(alice)),
      ).rejects.toThrow(ForbiddenError);
    });

    it('lets an admin change another user role', async () => {
      const updated = await service.update(
        alice.id,
        { role: 'admin' },
        requesterFor(admin),
      );

      expect(updated.role).toBe('admin');
    });

    it('forbids a user from updating another record', async () => {
      await expect(
        service.update(bob.id, { email: 'x@example.com' }, requesterFor(alice)),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects an email already taken by someone else', async () => {
      await expect(
        service.update(
          alice.id,
          { email: 'bob@example.com' },
          requesterFor(alice),
        ),
      ).rejects.toThrow(ConflictError);
    });

    it('allows setting an email to its current value', async () => {
      const updated = await service.update(
        alice.id,
        { email: 'alice@example.com' },
        requesterFor(alice),
      );

      expect(updated.email).toBe('alice@example.com')
    });

    it('detects a duplicate email regardless of case', async () => {
      await expect(
        service.update(
          alice.id,
          { email: 'BOB@Example.com' },
          requesterFor(alice),
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('remove', () => {
    it('lets a user delete their own account', async () => {
      await service.remove(alice.id, requesterFor(alice));

      await expect(users.findById(alice.id)).resolves.toBeNull();
    });

    it('lets an admin delete any account', async () => {
      await service.remove(alice.id, requesterFor(admin));

      await expect(users.findById(alice.id)).resolves.toBeNull();
    });

    it('forbids a user from deleting another account', async () => {
      await expect(
        service.remove(bob.id, requesterFor(alice)),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('list', () => {
    it('returns users without password hashed', async () => {
      const found = await service.list({ limit: 10, offset: 0 });

      expect(found).toHaveLength(3);
      expect(JSON.stringify(found)).not.toContain('passwordHash');
    });

    it('respects limit and offset', async () => {
      const page = await service.list({ limit: 2, offset: 0 });
      const next = await service.list({ limit: 2, offset: 2 });

      expect(page).toHaveLength(2);
      expect(next).toHaveLength(1);
    });
  });
});