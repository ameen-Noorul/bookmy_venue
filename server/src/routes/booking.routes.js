// routes/booking.routes.js
const router = require("express").Router();
const { createBookingSchema } = require("../schemas/booking.schema");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const bookingController = require("../controllers/booking.controller");
const { authorizeBookingOwner } = require("../middleware/authorize");

router.post(
  "/bookings",
  authenticate,
  validate(createBookingSchema),
  bookingController.create,
);

router.delete(
  "/bookings/:bookingId",
  authenticate,
  authorizeBookingOwner,
  bookingController.cancel,
);

module.exports = router;
