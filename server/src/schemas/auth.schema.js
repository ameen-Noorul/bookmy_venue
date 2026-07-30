const { z } = require('zod');

// No `role` field here at all, on purpose. Letting a client pick their own
// role at signup — even restricted to a couple of options — means anyone
// could just declare themselves an OWNER. Role is never something the client
// supplies; it starts as USER for everyone and is only ever changed by the
// server itself, as a side effect of an ADMIN approving that user's venue
// (see venue.service.js).
const registerSchema = z.object({
  body: z
    .object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      name: z.string().trim().min(2).max(100),
    })
    .strict(),
});

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().toLowerCase().email(),
      password: z.string().min(1, 'Password is required'),
    })
    .strict(),
});

module.exports = { registerSchema, loginSchema };