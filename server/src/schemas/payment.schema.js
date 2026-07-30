const { z } = require('zod');

const createPaymentSchema = z.object({
  body: z
    .object({
      bookingId: z.string().uuid(),
      amount: z.number().int().positive(), // stored in smallest currency unit — see Payment model comment
    })
    .strict(),
});

// In a real integration, verification comes from a webhook/callback sent by
// your payment provider (Stripe, Razorpay, etc.), carrying a cryptographic
// signature you'd verify. Here we SIMULATE that callback with a simple
// "success: true/false" flag so you can test both outcomes without wiring up
// a real payment gateway yet.
const verifyPaymentSchema = z.object({
  params: z.object({
    paymentId: z.string().uuid(),
  }),
  body: z
    .object({
      success: z.boolean(),
    })
    .strict(),
});

module.exports = { createPaymentSchema, verifyPaymentSchema };