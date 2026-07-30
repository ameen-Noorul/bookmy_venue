const router = require('express').Router();
const venueController = require('../controllers/venue.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const { createVenueSchema, reviewVenueSchema } = require('../schemas/venue.schema');

// Public — anyone can browse approved venues, no login required.
router.get('/', venueController.getApproved);

// Any logged-in user can submit a venue — no OWNER role required upfront.
// A user only BECOMES an OWNER once an ADMIN approves one of their venues
// (see venue.service.js reviewVenue()). Requiring OWNER here would be
// backwards: it would mean a user needs the role before they've done
// anything to earn it.
router.post('/', authenticate, validate(createVenueSchema), venueController.create);

// Any logged-in user can check their own submissions (including
// PENDING/REJECTED ones) — same reasoning, they may not be an OWNER yet.
router.get('/mine', authenticate, venueController.getMine);

// ADMIN-only: list venues awaiting review, and approve/reject one.
router.get('/pending', authenticate, authorizeRoles('ADMIN'), venueController.getPending);
router.patch(
  '/:venueId/review',
  authenticate,
  authorizeRoles('ADMIN'),
  validate(reviewVenueSchema),
  venueController.review
);

module.exports = router;