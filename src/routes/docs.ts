import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from 'yaml';
import helmet from "helmet";

const here = dirname(fileURLToPath(import.meta.url));
const specPath = join(here, '..', 'docs', 'openapi.yaml');
const spec = parse(readFileSync(specPath, 'utf8')) as object;

export const docsRouter = Router();

docsRouter.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https:'],
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  }),
);

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(spec);
});

docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(spec));