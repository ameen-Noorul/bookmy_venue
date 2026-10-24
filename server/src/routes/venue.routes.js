const router = require('express').Router();
const venueController = require('../controllers/venue.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles, authorizeVenueOwner } = require('../middleware/authorize');
const {
  createVenueSchema,
  reviewVenueSchema,
  listVenuesSchema,
  updateVenueSchema,
} = require('../schemas/venue.schema');

// IMPORTANT: fixed paths (/mine, /pending) must be registered BEFORE /:venueId,
// otherwise Express treats "mine" and "pending" as a venue id.

// Public: anyone can browse approved venues, no login required.
router.get('/', validate(listVenuesSchema), venueController.getApproved);

// Any logged-in user can check their own submissions.
router.get('/mine', authenticate, venueController.getMine);

// ADMIN-only: list venues awaiting review.
router.get('/pending', authenticate, authorizeRoles('ADMIN'), venueController.getPending);

// Public: view a single venue's detail page.
router.get('/:venueId', venueController.getById);

// Any logged-in user can submit a venue (no OWNER role required upfront).
router.post('/', authenticate, validate(createVenueSchema), venueController.create);

// Owner-only: edit or delete a venue they own. authorizeVenueOwner confirms
// req.user.id === venue.ownerId before the controller runs.
router.patch(
  '/:venueId',
  authenticate,
  authorizeVenueOwner,
  validate(updateVenueSchema),
  venueController.update
);

router.delete(
  '/:venueId',
  authenticate,
  authorizeVenueOwner,
  venueController.remove
);

// ADMIN-only: approve or reject a venue.
router.patch(
  '/:venueId/review',
  authenticate,
  authorizeRoles('ADMIN'),
  validate(reviewVenueSchema),
  venueController.review
);

module.exports = router;