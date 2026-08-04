const { z } = require("zod");

// Matches the REAL Venue model's required fields. pricePerDay is a Prisma
// Decimal column — Prisma accepts a plain JS number for Decimal fields on
// create, so z.coerce.number() is fine here; no special Decimal type needed
// in application code for this MVP level.
const createVenueSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().max(2000).optional(),
      address: z.string().trim().min(5).max(255),
      city: z.string().trim().min(2).max(100),
      state: z.string().trim().min(2).max(100),
      pincode: z.string().trim().min(3).max(20),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      capacity: z.coerce.number().int().positive().max(50000),
      pricePerDay: z.coerce.number().positive(),
      amenities: z
        .array(z.string().trim().toLowerCase().max(50))
        .max(30)
        .default([])
        .transform((arr) => [...new Set(arr)]),
      photos: z.array(z.string().url()).max(20).default([]),
      cancellationPolicy: z.record(z.any()).optional(), // free-form JSON — see note in venue.service.js
      rules: z.string().trim().max(2000).optional(),
    })
    .strict(),
});

// Used by an ADMIN to approve or reject a pending venue.
// NOTE: this schema's real enum has no "REJECTED" venue status — SUSPENDED
// is the closest equivalent, used to mean "not approved / taken down."
const reviewVenueSchema = z.object({
  params: z.object({
    venueId: z.string().uuid(),
  }),
  body: z
    .object({
      status: z.enum(["ACTIVE", "SUSPENDED"]),
    })
    .strict(),
});

// z.coerce.number() converts the incoming text ("2") into a real number (2)
// — remember, URL query params always arrive as text, never as numbers.
const listVenuesSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(50).default(10),
      city: z.string().trim().optional(),
    })
    .strict(),
});

module.exports = { createVenueSchema, reviewVenueSchema, listVenuesSchema };
