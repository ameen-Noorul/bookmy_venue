const prisma = require('../db/prismaClient');
const AppError = require('../utils/AppError');
const { notifyOwnerOfBooking } = require('./notification.service');

async function createPayment({ bookingId, amount }) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new AppError('Booking not found', 404);
  }
  if (booking.status !== 'PENDING_PAYMENT') {
    throw new AppError('This booking is not awaiting payment', 400);
  }

  return prisma.payment.create({
    data: { bookingId, amount, status: 'PENDING' },
  });
}

// This is where a REAL transaction matters (more so than the single insert in
// booking.service.js — a single insert is already atomic on its own).
// Here we need to change THREE things together: the payment's status, the
// booking's status, and create a notification. If the server crashed halfway
// — say, right after marking the payment SUCCESS but before confirming the
// booking — you'd end up with a paid-for booking that's still stuck showing
// as unconfirmed, a genuinely confusing, hard-to-debug state.
//
// prisma.$transaction wraps every write inside the callback as one atomic
// unit: either ALL of them succeed and are saved together, or if ANY one
// fails, the database automatically undoes (rolls back) everything else in
// that block too — so you never end up with only some of the changes applied.
async function verifyPayment(paymentId, success) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { booking: { include: { venue: true } } },
  });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }
  if (payment.status !== 'PENDING') {
    throw new AppError('This payment has already been processed', 400);
  }

  if (success) {
    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'SUCCESS' },
      }),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ]);

    // Notifying the owner isn't part of the atomic money/booking state, so it
    // deliberately sits outside the $transaction block — if this insert
    // failed, we wouldn't want to undo a successful payment confirmation
    // because of it.
    await notifyOwnerOfBooking(
      payment.booking.venue.ownerId,
      payment.booking.venue.name,
      payment.booking.eventDate
    );

    return updatedPayment;
  }

  // Payment failed: mark it FAILED, and cancel the booking so the date frees
  // up for someone else instead of staying blocked forever.
  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'FAILED' },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CANCELLED' },
    }),
  ]);

  return updatedPayment;
}

module.exports = { createPayment, verifyPayment };