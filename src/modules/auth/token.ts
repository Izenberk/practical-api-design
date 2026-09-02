import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../core/errors/app-error.js';
import type { UserRole } from '../users/user.types.js'

export interface TokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: UserRole;
}

const isTokenPayload = (value: unknown): value is TokenPayload => {
  if (typeof value !== 'object' || value === null) return false;

  const claims = value as Record<string, unknown>;

  return (
    typeof claims.sub === 'string' &&
    typeof claims.email === 'string' &&
    (claims.role === 'admin' || claims.role === 'user')
  );
};

export const signAccessToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_SECONDS,
  });

  export const verifyAccessToken = (token: string): TokenPayload => {
    let decoded: unknown;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (!isTokenPayload(decoded)) {
      throw new UnauthorizedError('Malformed token payload');
    }

    return decoded;
  }