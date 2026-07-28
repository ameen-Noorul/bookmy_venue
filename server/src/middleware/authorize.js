// middleware/authorize.js
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const prisma = require('../db/prismaClient');

const authorizeBookingOwner = catchAsync(async (req, res, next) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.bookingId },
  });

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.userId !== req.user.id) {
    return next(new AppError('You are not authorized to access this booking', 403));
  }

  req.booking = booking; // pass it along so the controller doesn't have to fetch it again
  next();
});

module.exports = { authorizeBookingOwner };