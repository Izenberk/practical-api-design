import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const specPath = join(here, '..', 'docs', 'openapi.yaml');
const spec = parse(readFileSync(specPath, 'utf8')) as object;

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(spec);
});

docsRouter.use('/', swaggerUi.serve, swaggerUi.setup(spec));