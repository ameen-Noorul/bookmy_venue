// services/booking.service.js
const prisma = require('../db/prismaClient'); // your existing Prisma setup

async function createBooking(data, userId) {
  const booking = await prisma.booking.create({
    data: {
      venueId: data.venueId,
      startTime: data.startTime,
      endTime: data.endTime,
      guestCount: data.guestCount,
      userId: userId,
    },
  });
  return booking;
}

module.exports = { createBooking };