import type { TokenPayload } from "../../modules/auth/token.ts";

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: TokenPayload;
    }
  }
}

export {};