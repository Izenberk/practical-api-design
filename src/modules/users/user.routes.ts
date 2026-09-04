import { Router } from "express";
import { UserController } from "./user.controller.js";
import { UserService } from "./user.service.js";
import { container } from "../../core/container.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  listUsersSchema,
  userIdSchema,
  updateUserSchema,
} from "./user.schema.js";

const service = new UserService(container.users);
const controller = new UserController(service);

export const userRouter = Router();

userRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  validate(listUsersSchema, 'query'),
  controller.list,
)

userRouter.get('/me', authenticate, controller.getMe);

userRouter.get(
  '/:id',
  authenticate,
  validate(userIdSchema, 'params'),
  controller.getById,
);

userRouter.put(
  '/:id',
  authenticate,
  validate(userIdSchema, 'params'),
  validate(updateUserSchema),
  controller.update,
)

userRouter.delete(
  '/:id',
  authenticate,
  validate(userIdSchema, 'params'),
  controller.remove,
);