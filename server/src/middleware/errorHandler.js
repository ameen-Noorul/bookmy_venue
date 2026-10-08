const AppError = require("../utils/AppError");

function normalize(err) {
  if (err instanceof AppError) {
    return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }

  // Prisma known errors
  if (err.code === "P2002") {
    return { status: 409, code: "CONFLICT", message: "A record with this value already exists" };
  }
  if (err.code === "P2025") {
    return { status: 404, code: "NOT_FOUND", message: "Record not found" };
  }

  // JWT errors
  if (err.name === "TokenExpiredError") {
    return { status: 401, code: "TOKEN_EXPIRED", message: "Access token expired" };
  }
  if (err.name === "JsonWebTokenError") {
    return { status: 401, code: "INVALID_TOKEN", message: "Invalid token" };
  }

  // Malformed JSON body (thrown by express.json())
  if (err.type === "entity.parse.failed") {
    return { status: 400, code: "INVALID_JSON", message: "Request body is not valid JSON" };
  }

  // Unknown: never leak internals
  return { status: 500, code: "INTERNAL_ERROR", message: "Something went wrong" };
}

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const { status, code, message, details } = normalize(err);

  const logger = req.log || console;
  if (status >= 500) {
    logger.error({ err, requestId: req.id }, "unhandled error");
  } else {
    logger.warn({ code, requestId: req.id }, message);
  }

  res.status(status).json({
    error: { code, message, ...(details && { details }), requestId: req.id },
  });
};