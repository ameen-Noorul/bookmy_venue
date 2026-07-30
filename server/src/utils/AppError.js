// A normal JavaScript `Error` doesn't carry an HTTP status code, and doesn't
// tell you whether it was an *expected* problem (bad input, not found, no
// permission) versus a real bug (a typo, a crashed database connection).
// AppError adds both of those, so the error handler can treat them differently.
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // sets this.message, same as a normal Error
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // marks this as an "expected" error, not a crash

    // Keeps the stack trace clean — excludes this constructor itself from it,
    // so the trace points to where AppError was thrown, not to this file.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;