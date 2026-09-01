import morgan from "morgan";
import type { RequestHandler } from "express";
import { logger } from "../core/logger.js";

morgan.token('id', (req) => (req as {id?: string}).id ?? '-');

export const requestLogger: RequestHandler = morgan(
  ':id :method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => {
        logger.http(message.trim());
      },
    },
  },
);