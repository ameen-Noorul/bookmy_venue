class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes "expected failure" from a real bug
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;