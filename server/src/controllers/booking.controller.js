// controllers/booking.controller.js
const catchAsync = require("../utils/catchAsync");
const bookingService = require("../services/booking.service");


//create booking
const create = catchAsync(async (req, res, next) => {
  const booking = await bookingService.createBooking(req.body, req.user.id);
  res.status(201).json({ status: "success", data: booking });
});

//cancel booking
const cancel = catchAsync(async (req, res, next) => {
  const cancelled = await bookingService.cancelBooking(req.booking.id);
  res.status(200).json({ status: "success", data: cancelled });
});

module.exports = { create, cancel };
