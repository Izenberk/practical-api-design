import { describe, it, expect } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { authorize } from "./authorize.js";
import type { UserRole } from "../modules/users/user.types.js";
import type { TokenPayload } from "../modules/auth/token.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../core/errors/app-error.js"

const runAuthorize = (allowed: UserRole[], user?: TokenPayload): unknown => {
  const req = { user } as unknown as Request;
  const res = {} as unknown as Response;
  let captured: unknown = null;

  const next: NextFunction = (err?: unknown) => {
    captured = err ?? null;
  };

  authorize(...allowed)(req, res, next);

  return captured;
};

const adminUser: TokenPayload = {
  sub: '00000000-0000-4000-8000-000000000000',
  email: 'admin@example.com',
  role: 'admin',
}

const normalUser: TokenPayload = { ...adminUser, role: 'user' };

describe('authorize', () => {
  it('rejects an unauthenticated request with UnauthorizedError', () => {
    expect(runAuthorize(['admin'])).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a wrong role with ForbiddenError', () => {
    expect(runAuthorize(['admin'], normalUser)).toBeInstanceOf(ForbiddenError);
  });

  it('passes a matching role through', () => {
    expect(runAuthorize(['admin'], adminUser)).toBeNull();
  });

  it('accept any of serveral allowed roles', () => {
    expect(runAuthorize(['admin', 'user'], normalUser)).toBeNull();
  });
});