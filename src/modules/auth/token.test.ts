import { describe, it, expect } from "@jest/globals";
import jwt from "jsonwebtoken";
import { signAccessToken, verifyAccessToken } from "./token.js";
import type { TokenPayload } from "./token.js";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../core/errors/app-error.js";

const payload: TokenPayload = {
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  role: 'admin',
};

describe('token', () => {
  it('round-trips sub, email and role', () => {
    const decoded = verifyAccessToken(signAccessToken(payload));

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe('admin');
  });

  it('rejects a token signed with a different secret', () => {})
})