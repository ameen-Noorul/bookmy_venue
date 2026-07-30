const router = require('express').Router();
const bookingController = require('../controllers/booking.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authorizeBookingOwner } = require('../middleware/authorize');
const { createBookingSchema } = require('../schemas/booking.schema');

router.post('/', authenticate, validate(createBookingSchema), bookingController.create);
router.get('/mine', authenticate, bookingController.getMine);

// Order matters: authenticate (who are you) -> authorizeBookingOwner (do you
// own THIS booking) -> controller (do the actual work).
router.delete(
  '/:bookingId',
  authenticate,
  authorizeBookingOwner,
  bookingController.cancel
);

module.exports = router;