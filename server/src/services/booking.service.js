const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { notifyOwnerOfBooking } = require('./notification.service');
const { calculateBookingAmounts } = require('../utils/pricing');

// Payment is deliberately removed for this MVP pass — see the note in the
// README. A booking is confirmed the moment it's created, instead of
// starting as PENDING and waiting on a separate payment step.
async function createBooking(
  { venueId, eventDate, eventEndDate, eventType, guestCount },
  userId
) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new AppError('Venue not found', 404);
  }
  if (venue.status !== 'ACTIVE') {
    throw new AppError('This venue is not available for booking', 400);
  }

  // Money is ALWAYS calculated here, server-side, from the venue's real
  // price — never taken from the request body. This is what stops a client
  // from tampering with the price of their own booking.
  const pricePerDay = Number(venue.pricePerDay); // Prisma Decimal -> plain number for this MVP-level calculation
  const { totalAmount, platformFee, ownerAmount } = calculateBookingAmounts(
    pricePerDay,
    eventDate,
    eventEndDate
  );

  // A snapshot of the venue's cancellation policy AT THE MOMENT OF BOOKING.
  // This matters because if the owner changes their policy next month, a
  // booking made under the OLD policy should still honor what the customer
  // originally agreed to — copying it here means later policy edits can
  // never retroactively change what an existing booking is bound by.
  const policySnapshot = venue.cancellationPolicy || {};

  let booking;
  try {
    // NOTE on a real limitation in the current schema: @@unique([venueId,
    // eventDate]) only blocks an exact match on the START date — it does
    // NOT check for overlapping ranges (e.g. an existing Jan 1-5 booking
    // wouldn't block a new Jan 3-7 request, since Jan 3 != Jan 1). Proper
    // range-overlap blocking needs a different kind of database constraint
    // (an exclusion constraint, not a simple unique one) — that's a
    // hardening-pass concern, not something to fix in today's MVP push.
    booking = await prisma.booking.create({
      data: {
        venueId,
        userId,
        eventDate,
        eventEndDate,
        eventType,
        guestCount,
        totalAmount,
        platformFee,
        ownerAmount,
        policySnapshot,
        status: 'CONFIRMED',
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError('This venue is already booked for that date', 409);
    }
    throw err;
  }

  // Since there's no payment step anymore to trigger this, the owner gets
  // notified right here, right after the booking is confirmed.
  await notifyOwnerOfBooking(venue.ownerId, venue.name, booking.eventDate);

  return booking;
}

async function cancelBooking(bookingId) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  });
}

async function getBookingsByUser(userId) {
  return prisma.booking.findMany({ where: { userId } });
}

module.exports = { createBooking, cancelBooking, getBookingsByUser };