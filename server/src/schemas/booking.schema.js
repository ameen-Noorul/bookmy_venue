const { z } = require('zod');

// IMPORTANT: totalAmount, platformFee, ownerAmount are deliberately NOT in
// this schema at all. A client should never be able to tell your server how
// much a booking costs — that's the kind of field an attacker could tamper
// with to book a venue for ₹1 instead of the real price. Those three fields
// are calculated entirely server-side, in booking.service.js, from the
// venue's real pricePerDay.
const createBookingSchema = z.object({
  body: z
    .object({
      venueId: z.string().uuid({ message: 'venueId must be a valid UUID' }),
      eventDate: z.coerce.date(),
      eventEndDate: z.coerce.date(),
      eventType: z.string().trim().min(2).max(100),
      guestCount: z.number().int().positive().max(100000),
    })
    .strict()
    .refine((data) => data.eventDate > new Date(), {
      message: 'eventDate must be in the future',
      path: ['eventDate'],
    })
    .refine((data) => data.eventEndDate > data.eventDate, {
      message: 'eventEndDate must be on or after eventDate',
      path: ['eventEndDate'],
    }),
});

module.exports = { createBookingSchema };