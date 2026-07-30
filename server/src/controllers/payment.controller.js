const catchAsync = require('../utils/catchAsync');
const paymentService = require('../services/payment.service');

const create = catchAsync(async (req, res) => {
  const payment = await paymentService.createPayment(req.body);
  res.status(201).json({ status: 'success', data: payment });
});

// Stands in for a real payment gateway's webhook/callback. In production
// this endpoint would instead be called BY Stripe/Razorpay/etc., and you'd
// verify a cryptographic signature to confirm the request genuinely came
// from them before trusting it.
const verify = catchAsync(async (req, res) => {
  const payment = await paymentService.verifyPayment(
    req.params.paymentId,
    req.body.success
  );
  res.status(200).json({ status: 'success', data: payment });
});

module.exports = { create, verify };