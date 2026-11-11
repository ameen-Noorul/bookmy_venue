const prisma = require("../db/prismaClient");
const AppError = require("../utils/AppError");
const { calculateBookingAmounts } = require("../utils/pricing");
const { notificationQueue } = require("../queues/notification.queue");

// Payment is deliberately removed for this MVP pass — see the note in the
// README. A booking is confirmed the moment it's created, instead of
// starting as PENDING and waiting on a separate payment step.
async function createBooking(
  { venueId, eventDate, eventEndDate, eventType, guestCount },
  userId,
) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new AppError("Venue not found", 404);
  }
  if (venue.status !== "ACTIVE") {
    throw new AppError("This venue is not available for booking", 400);
  }

  // Money is ALWAYS calculated here, server-side, from the venue's real
  // price — never taken from the request body. This is what stops a client
  // from tampering with the price of their own booking.
  const pricePerDay = Number(venue.pricePerDay); // Prisma Decimal -> plain number for this MVP-level calculation
  const { totalAmount, platformFee, ownerAmount } = calculateBookingAmounts(
    pricePerDay,
    eventDate,
    eventEndDate,
  );

  // A snapshot of the venue's cancellation policy AT THE MOMENT OF BOOKING.
  // This matters because if the owner changes their policy next month, a
  // booking made under the OLD policy should still honor what the customer
  // originally agreed to — copying it here means later policy edits can
  // never retroactively change what an existing booking is bound by.
  const policySnapshot = venue.cancellationPolicy || {};

  let booking;
  try {
    // Double-booking is prevented by the database itself: the
    // no_overlapping_bookings EXCLUDE constraint rejects any CONFIRMED or
    // PENDING booking whose date range overlaps another on the same venue.
    // Cancelled bookings are excluded, so they free their dates.
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
        status: "CONFIRMED",
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      throw new AppError("This venue is already booked for that date", 409);
    }
    if (err.message && err.message.includes("no_overlapping_bookings")) {
      throw new AppError(
        "This venue is already booked for an overlapping date range",
        409,
      );
    }

    throw err;
  }

  // Since there's no payment step anymore to trigger this, the owner gets
  // notified right here, right after the booking is confirmed. This is now
  // QUEUED instead of called directly — the API responds to the user
  // immediately, and the actual notification write happens in the
  // background worker (server/src/workers/notification.worker.js).
  await notificationQueue.add("notify-owner-booking", {
    ownerId: venue.ownerId,
    venueName: venue.name,
    eventDate: booking.eventDate,
  });

  return booking;
}

async function cancelBooking(bookingId) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  if (booking.status === "CANCELLED") {
    throw new AppError("This booking is already cancelled", 400);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (new Date(booking.eventDate) <= today) {
    throw new AppError(
      "This booking has already started and cannot be cancelled",
      400,
    );
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });
}

async function getBookingsByUser(userId) {
  return prisma.booking.findMany({
    where: { userId },
    orderBy: { eventDate: "desc" },
    include: {
      venue: { select: { id: true, name: true, city: true, state: true } },
    },
  });
}
async function getBookingsForOwner(ownerId) {
  return prisma.booking.findMany({
    where: { venue: { ownerId } },
    orderBy: { eventDate: "asc" },
    include: {
      venue: { select: { id: true, name: true, city: true, state: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}
// For a venue OWNER: every booking made on a venue they own. Ownership
// itself is verified upstream by authorizeVenueOwner middleware before this
// ever runs — this function's only job is the query.
async function getBookingsByVenue(venueId) {
  return prisma.booking.findMany({ where: { venueId } });
}

module.exports = {
  createBooking,
  cancelBooking,
  getBookingsByUser,
  getBookingsForOwner,
  getBookingsByVenue,
};
