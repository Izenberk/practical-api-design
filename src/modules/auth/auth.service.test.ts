import { describe, it, expect, beforeEach } from "@jest/globals";
import { AuthService } from "./auth.service.js";
import { InMemoryUserRepository } from "../users/user.repository.memory.js";
import { verifyAccessToken } from "./token.js";
import {
  ConflictError,
  UnauthorizedError,
} from "../../core/errors/app-error.js";

describe('AuthService', () => {
  const email = 'Brainy@Example.com';
  const normalized = 'brainy@example.com';
  const password = 'hunter2hunter2';

  let users: InMemoryUserRepository;
  let service: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new AuthService(users);
  });

  describe('register', () => {
    it('create a user with role "user" and issues a token', async () => {
      const result = await service.register(email, password);

      expect(result.user.email).toBe(normalized);
      expect(result.user.role).toBe('user');
      expect(verifyAccessToken(result.accessToken).sub).toBe(result.user.id);
    });

    it('never exposes the password or its hash', async () => {
      const result = await service.register(email, password);

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain(password);
    });

    it('rejects a duplicate email with COnflictError', async () => {
      await service.register(email, password);

      await expect(service.register(email, password)).rejects.toThrow(
        ConflictError,
      );
    });

    it('treats email as case-insensitive when detecting duplicates', async () => {
      await service.register(normalized, password);

      await expect(service.register(email, password)).rejects.toThrow(
        ConflictError,
      );
    });
  });

  describe('login', () => {
    it('returns a token for correct credentials', async () => {
      const registered = await service.register(email, password);

      const result = await service.login(email, password);

      expect(result.user.id).toBe(registered.user.id);
      expect(verifyAccessToken(result.accessToken).role).toBe('user');
    });

    it('gives an identical error for a wrong password and an unknown email', async () => {
      await service.register(email, password);

      const wrongPassword = await service
        .login(email, 'wrongwrongwrong')
        .catch((error: unknown) => error);

      const unknownEmail = await service
        .login('nobody@examle.com', password)
        .catch((error: unknown) => error);

      expect(wrongPassword).toBeInstanceOf(UnauthorizedError);
      expect(unknownEmail).toBeInstanceOf(UnauthorizedError);
      expect((wrongPassword as Error).message).toBe(
        (unknownEmail as Error).message,
      );
    });
  });
});