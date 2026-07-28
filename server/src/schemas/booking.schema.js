
const { z } = require('zod');

const createBookingSchema = z.object({
  body: z.object({
    venueId: z.string().uuid(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    guestCount: z.number().int().positive(),
  }),
});

module.exports = { createBookingSchema };