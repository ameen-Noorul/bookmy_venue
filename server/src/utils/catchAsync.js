// Wraps an async route handler. If the promise rejects, forward the error
// to next() instead of letting it become an unhandled rejection.
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;