const DEFAULT_CODES = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
};

class AppError extends Error {
  // Same order as the rest of your code: (message, statusCode).
  // `code` and `details` are optional extras.
  constructor(message, statusCode = 500, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || DEFAULT_CODES[statusCode] || "INTERNAL_ERROR";
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;