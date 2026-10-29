const { z } = require('zod');

const listUsersSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(50).default(20),
      search: z.string().trim().max(100).optional(),
    })
    .strict(),
});

const banUserSchema = z.object({
  params: z.object({ userId: z.string().uuid() }),
  body: z.object({ isBanned: z.boolean() }).strict(),
});

// ADMIN promotion is deliberately not possible through the API.
const setRoleSchema = z.object({
  params: z.object({ userId: z.string().uuid() }),
  body: z.object({ role: z.enum(['USER', 'OWNER']) }).strict(),
});

module.exports = { listUsersSchema, banUserSchema, setRoleSchema };