const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Always log the full error server-side for debugging
  console.error(err);

  res.status(statusCode).json({
    message: isOperational
      ? err.message
      : 'Something went wrong. Please try again.', // never leak internals for unexpected errors
  });
};

module.exports = errorHandler;