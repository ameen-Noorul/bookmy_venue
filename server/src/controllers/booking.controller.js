const catchAsync = require('../utils/catchAsync');
const bookingService = require('../services/booking.service');

const create = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  res.status(201).json({ status: 'success', data: booking });
});

const cancel = catchAsync(async (req, res) => {
  const cancelled = await bookingService.cancelBooking(req.booking.id);
  res.status(200).json({ status: 'success', data: cancelled });
});

const getMine = catchAsync(async (req, res) => {
  const bookings = await bookingService.getBookingsByUser(req.user.id);
  res.status(200).json({ status: 'success', data: bookings });
});

// --- Owner: get one booking by id ----------------------------------------
// req.booking is already attached by authorizeBookingOwner, which already
// confirmed req.user owns it — no extra DB call needed here.
const getById = catchAsync(async (req, res) => {
  res.status(200).json({ status: 'success', data: req.booking });
});

// --- Venue owner: list all bookings made on a venue they own -------------
// req.venue is attached by authorizeVenueOwner, but we only need the id
// from the URL param here since the service just needs the venueId.
const getByVenue = catchAsync(async (req, res) => {
  const bookings = await bookingService.getBookingsByVenue(req.params.venueId);
  res.status(200).json({ status: 'success', data: bookings });
});

module.exports = { create, cancel, getMine, getById, getByVenue };