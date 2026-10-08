const router = require('express').Router();
const venueController = require('../controllers/venue.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles, authorizeVenueOwner } = require('../middleware/authorize');
const {
  createVenueSchema,
  reviewVenueSchema,
  listVenuesSchema,
  updateVenueSchema, // you'll need to add this to venue.schema.js — see note below
} = require('../schemas/venue.schema');

// Public — anyone can browse approved venues, no login required.
router.get('/', validate(listVenuesSchema), venueController.getApproved);

// Public — view a single venue's detail page. No auth: same reasoning as
// the list route above, this is pre-booking browsing.
router.get('/:venueId', venueController.getById);

// Any logged-in user can submit a venue — no OWNER role required upfront.
router.post('/', authenticate, validate(createVenueSchema), venueController.create);

// Any logged-in user can check their own submissions.
router.get('/mine', authenticate, venueController.getMine);

// Owner-only: edit or delete a venue they own. authorizeVenueOwner fetches
// the venue and confirms req.user.id === venue.ownerId before letting the
// controller run — a non-owner gets 403 here, before any DB write happens.
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