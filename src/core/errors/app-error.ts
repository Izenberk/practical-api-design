export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly isOperational = true;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly code = 'CONFLICT';
}

export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';
}