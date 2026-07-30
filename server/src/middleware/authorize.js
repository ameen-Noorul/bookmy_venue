// authenticate.js answers "who are you?" — this file answers "are you allowed
// to do THIS specific thing?" These are deliberately separate concerns, and
// authenticate must always run first (you can't check permissions for an
// unknown user).

const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const prisma = require('../db/prismaClient');

// --- Role-based check -------------------------------------------------
// Usage: authorizeRoles('ADMIN') or authorizeRoles('OWNER', 'ADMIN')
// Returns a middleware that only lets the request through if req.user.role
// is one of the allowed roles.
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action', 403)
    );
  }
  next();
};

// --- Ownership check: booking -----------------------------------------
// Confirms the logged-in user owns the specific booking referenced in the URL
// (e.g. DELETE /bookings/:bookingId). Prevents User B from touching User A's
// booking just by guessing/knowing its id.
const authorizeBookingOwner = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
  });

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.userId !== req.user.id) {
    return next(
      new AppError('You are not authorized to access this booking', 403)
    );
  }

  req.booking = booking; // pass it along so the controller doesn't re-fetch it
  next();
});

// --- Ownership check: venue --------------------------------------------
// Confirms the logged-in OWNER owns the specific venue referenced in the URL.
const authorizeVenueOwner = catchAsync(async (req, res, next) => {
  const venue = await prisma.venue.findUnique({
    where: { id: req.params.venueId },
  });

  if (!venue) {
    return next(new AppError('Venue not found', 404));
  }

  if (venue.ownerId !== req.user.id) {
    return next(
      new AppError('You are not authorized to access this venue', 403)
    );
  }

  req.venue = venue;
  next();
});

module.exports = { authorizeRoles, authorizeBookingOwner, authorizeVenueOwner };