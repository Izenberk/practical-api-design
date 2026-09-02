import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { container } from "../../core/container.js";
import { validate } from "../../middleware/validate.js";
import { registerSchema, loginSchema } from "../users/user.schema.js";

const service = new AuthService(container.users);
const controller = new AuthController(service);

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), controller.register);
authRouter.post('/login', validate(loginSchema), controller.login);