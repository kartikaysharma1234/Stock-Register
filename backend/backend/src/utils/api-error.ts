export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ApiError extends AppError {
  constructor(statusCode: number, message: string, details?: unknown) {
    super(statusCode, message, details);
    this.name = "ApiError";
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(422, message, details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden", details?: unknown) {
    super(403, message, details);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", details?: unknown) {
    super(409, message, details);
    this.name = "ConflictError";
  }
}
