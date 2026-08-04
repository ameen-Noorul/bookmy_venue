// Express treats a middleware function with FOUR parameters (err, req, res, next)
// specially: it only runs this when something calls next(err) or throws inside
// an async handler wrapped by catchAsync. This must be the LAST app.use() call
// in app.js, because Express only forwards errors to middleware defined AFTER
// the route/middleware that raised them.

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  // isOperational (set by AppError) means "an expected problem we already
  // understand" — safe to show the real message to the client.
  // Anything else is an unexpected bug — we log the full detail for
  // ourselves, but only send a generic message to the client, so we never
  // leak internal implementation details (file paths, database structure) to
  // whoever is calling the API.
  if (err.isOperational) {
    // Still worth logging, but at a lower severity ("warn") — this is
    // expected, handled behavior (a 400/404/403), not a real bug. Keeping
    // these in the logs (rather than not logging them at all) lets you spot
    // patterns later — e.g. "this one endpoint gets a LOT of 404s" can be a
    // useful signal even though none of them are individually a crash.
    logger.warn({ err, requestId: req.id }, err.message);
    return res.status(statusCode).json({
      status,
      message: err.message,
    });
  }

  // "error" level (higher severity than "warn") for anything unexpected —
  // this is what you'd want an alert/monitoring tool watching for in
  // production, since it means a real bug just happened, not just a normal
  // rejected request.
  logger.error({ err, requestId: req.id }, 'Unexpected error');

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

module.exports = errorHandler;