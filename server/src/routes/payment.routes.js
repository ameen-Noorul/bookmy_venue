const router = require('express').Router();
const paymentController = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { createPaymentSchema, verifyPaymentSchema } = require('../schemas/payment.schema');

router.post('/', authenticate, validate(createPaymentSchema), paymentController.create);

// Simulated gateway callback — see the comment in payment.controller.js.
router.post(
  '/:paymentId/verify',
  authenticate,
  validate(verifyPaymentSchema),
  paymentController.verify
);

module.exports = router;