import type { RequestHandler } from "express";
import type { AuthService } from "./auth.service.js";

interface Credentials {
  readonly email: string;
  readonly password: string;
}

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register: RequestHandler = async (req, res) => {
    const { email, password } = req.body as Credentials;
    const result = await this.service.register(email, password);

    res.status(201).json({ data: result });
  };

  login: RequestHandler = async (req, res) => {
    const { email, password } = req.body as Credentials;
    const result = await this.service.login(email, password);

    res.json({ data: result });
  };
}