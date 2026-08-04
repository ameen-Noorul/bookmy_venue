// A single reusable middleware that validates req.body / req.query / req.params
// against whatever Zod schema you pass in. This means every route gets
// validation by adding one line, instead of writing checks by hand each time.

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const errors = result.error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors,
    });
  }

  // IMPORTANT: overwrite the raw request data with the parsed/cleaned version.
  // This guarantees every controller downstream only ever sees trusted,
  // whitelisted data — any field not defined in the schema is silently
  // dropped by Zod, closing the door on "mass assignment" attacks (e.g. a
  // client sneaking an `isAdmin: true` field into the body).
  req.body = result.data.body;
  req.query = result.data.query;
  req.params = result.data.params;
  next();
};

module.exports = validate;