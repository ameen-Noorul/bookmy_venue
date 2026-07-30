const catchAsync = require('../utils/catchAsync');
const bookingService = require('../services/booking.service');

const create = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  res.status(201).json({ status: 'success', data: booking });
});

const cancel = catchAsync(async (req, res) => {
  // req.booking is attached by the authorizeBookingOwner middleware, which
  // already fetched it and confirmed req.user owns it — no need to fetch or
  // re-check ownership here.
  const cancelled = await bookingService.cancelBooking(req.booking.id);
  res.status(200).json({ status: 'success', data: cancelled });
});

const getMine = catchAsync(async (req, res) => {
  const bookings = await bookingService.getBookingsByUser(req.user.id);
  res.status(200).json({ status: 'success', data: bookings });
});

module.exports = { create, cancel, getMine };