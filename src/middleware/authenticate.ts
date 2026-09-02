import type { RequestHandler } from "express";
import { UnauthorizedError } from "../core/errors/app-error.js";
import { verifyAccessToken } from "../modules/auth/token.js";

const BEARER = 'Bearer ';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (header === undefined || !header.startsWith(BEARER)) {
    next(new UnauthorizedError('Missing or malformed Authorization header'));
    return;
  }

  try {
    req.user = verifyAccessToken(header.slice(BEARER.length).trim());
  } catch (error) {
    next(error);
    return;
  }

  next();
};