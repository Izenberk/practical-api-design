import type { Request, RequestHandler } from "express";
import type { UserService } from "./user.service.js";
import type { ListUsersOptions } from "./user.repository.js";
import type { Requester, UpdateUserInput } from "./user.types.js";
import { UnauthorizedError } from "../../core/errors/app-error.js";

const requesterOf = (req: Request): Requester => {
  if (req.user === undefined) {
    throw new UnauthorizedError('Authentication required');
  }

  return { id: req.user.sub, role: req.user.role };
};

export class UserController {
  constructor(private readonly service: UserService) {}

  list: RequestHandler = async (_req, res) => {
    const options = res.locals.query as ListUsersOptions;
    const users = await this.service.list(options);

    res.json({ data: users });
  };

  getMe: RequestHandler = async (req, res) => {
    const requester = requesterOf(req);
    const user = await this.service.getById(requester.id, requester);

    res.json({ data: user });
  };

  getById: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const user = await this.service.getById(id, requesterOf(req));

    res.json({ data: user });
  };

  update: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const user = await this.service.update(
      id,
      req.body as UpdateUserInput,
      requesterOf(req),
    );

    res.json({ data: user });
  };

  remove: RequestHandler = async (req, res) => {
    const { id } = res.locals.params as { id: string };
    await this.service.remove(id, requesterOf(req));

    res.status(204).send();
  };
}