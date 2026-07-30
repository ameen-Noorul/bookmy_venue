// Express treats a middleware function with FOUR parameters (err, req, res, next)
// specially: it only runs this when something calls next(err) or throws inside
// an async handler wrapped by catchAsync. This must be the LAST app.use() call
// in app.js, because Express only forwards errors to middleware defined AFTER
// the route/middleware that raised them.

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
    return res.status(statusCode).json({
      status,
      message: err.message,
    });
  }

  // eslint-disable-next-line no-console
  console.error('UNEXPECTED ERROR:', err);

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
};

module.exports = errorHandler;