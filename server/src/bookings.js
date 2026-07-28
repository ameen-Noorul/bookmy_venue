const express = require('express');
const db = require('./db');
const { requireLogin, requireRole } = require('./requireLogin');

const router = express.Router();

// User creates a booking
router.post('/', requireLogin, requireRole('USER'), async (req, res) => {
  const { venueId, eventDate, eventEndDate, eventType, guestCount } = req.body;

  const venue = await db.venue.findUnique({ where: { id: venueId } });
  if (!venue) return res.status(404).json({ message: 'Venue not found' });
  if (venue.status !== 'ACTIVE') return res.status(400).json({ message: 'Venue not available' });
  if (Number(guestCount) > venue.capacity) {
    return res.status(400).json({ message: `Max capacity is ${venue.capacity}` });
  }

  // Check overlap
  const overlap = await db.booking.findFirst({
    where: {
      venueId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      eventDate: { lte: new Date(eventEndDate) },
      eventEndDate: { gte: new Date(eventDate) },
    },
  });
  if (overlap) return res.status(400).json({ message: 'Venue already booked for these dates' });

  const days = Math.ceil(
    (new Date(eventEndDate) - new Date(eventDate)) / (1000 * 60 * 60 * 24)
  ) || 1;

  const totalAmount = Number(venue.pricePerDay) * days;
  const platformFee = Math.round(totalAmount * 0.1);
  const ownerAmount = totalAmount - platformFee;

  const booking = await db.booking.create({
    data: {
      venueId,
      userId: req.user.id,
      eventDate: new Date(eventDate),
      eventEndDate: new Date(eventEndDate),
      eventType,
      guestCount: Number(guestCount),
      totalAmount,
      platformFee,
      ownerAmount,
      status: 'PENDING',
      policySnapshot: {},
    },
  });

  res.json({ message: 'Booking created', booking });
});

// User sees their bookings
router.get('/my', requireLogin, requireRole('USER'), async (req, res) => {
  const bookings = await db.booking.findMany({
    where: { userId: req.user.id },
    include: {
      venue: { select: { name: true, city: true, photos: true } },
    },
  });

  res.json({ bookings });
});

// Owner sees bookings on their venues
router.get('/owner', requireLogin, requireRole('OWNER'), async (req, res) => {
  const bookings = await db.booking.findMany({
    where: { venue: { ownerId: req.user.id } },
    include: {
      venue: { select: { name: true, city: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  res.json({ bookings });
});

// Admin sees all bookings
router.get('/admin/all', requireLogin, requireRole('ADMIN'), async (req, res) => {
  const bookings = await db.booking.findMany({
    include: {
      venue: { select: { name: true, city: true } },
      user: { select: { name: true, email: true } },
    },
  });

  res.json({ bookings });
});

// Confirm booking (admin only for now)
router.patch('/:id/confirm', requireLogin, requireRole('ADMIN'), async (req, res) => {
  const booking = await db.booking.update({
    where: { id: req.params.id },
    data: { status: 'CONFIRMED' },
  });

  res.json({ message: 'Booking confirmed', booking });
});

// Cancel booking (user or admin)
router.patch('/:id/cancel', requireLogin, async (req, res) => {
  const booking = await db.booking.findUnique({ where: { id: req.params.id } });

  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const isOwner = booking.userId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'Not your booking' });
  }

  const updated = await db.booking.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
  });

  res.json({ message: 'Booking cancelled', booking: updated });
});

module.exports = router;