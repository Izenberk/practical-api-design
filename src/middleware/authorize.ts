import type { RequestHandler } from "express";
import type { UserRole } from "../modules/users/user.types.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../core/errors/app-error.js";

export const authorize =
  (...allowed: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (req.user === undefined) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!allowed.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permission'));
      return;
    }

    next();
  }
