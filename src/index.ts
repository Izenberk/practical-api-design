import express from 'express';
import { errorHandler } from './middleware/error-handler.js';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from './core/errors/app-error.js';

const app = express();
const PORT:number=3000;

app.use((req, _res, next) => {
  req.id = randomUUID();
  next();
});

app.get('/', (_req, res) => {
  res.send('Welcome to typescript backend');
})

app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log('The application is listening on port http://localhost/'+PORT);
})