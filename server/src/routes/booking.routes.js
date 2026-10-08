const router = require("express").Router();
const bookingController = require("../controllers/booking.controller");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/authenticate");
const { authorizeBookingOwner, authorizeVenueOwner } = require("../middleware/authorize");
const { createBookingSchema } = require("../schemas/booking.schema");
const idempotency = require("../middleware/idempotency");

router.post(
  "/",
  authenticate,
  idempotency,
  validate(createBookingSchema),
  bookingController.create,
);

router.get("/mine", authenticate, bookingController.getMine);

// Venue owner: see every booking made on a venue THEY own. Note this is
// /bookings/venue/:venueId, not /venues/:venueId/bookings — kept here since
// this file already owns all booking-shaped responses. authorizeVenueOwner
// (reused from venue.routes.js's pattern) checks ownership of the VENUE,
// not the booking — a different check than authorizeBookingOwner below.
router.get(
  "/venue/:venueId",
  authenticate,
  authorizeVenueOwner,
  bookingController.getByVenue,
);

// Order matters: authenticate (who are you) -> authorizeBookingOwner (do you
// own THIS booking) -> controller (do the actual work).
router.get(
  "/:bookingId",
  authenticate,
  authorizeBookingOwner,
  bookingController.getById,
);

router.delete(
  "/:bookingId",
  authenticate,
  authorizeBookingOwner,
  bookingController.cancel,
);

module.exports = router;