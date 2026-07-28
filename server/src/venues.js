const express = require('express');
const db = require('./db');
const { requireLogin, requireRole } = require('./requireLogin');

const router = express.Router();

// Anyone can see active venues
router.get('/', async (req, res) => {
  const { city, search } = req.query;

  const venues = await db.venue.findMany({
    where: {
      status: 'ACTIVE',
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
  });

  res.json({ venues });
});

// Get one venue
router.get('/:id', async (req, res) => {
  const venue = await db.venue.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { name: true, email: true } },
    },
  });

  if (!venue) return res.status(404).json({ message: 'Venue not found' });

  res.json({ venue });
});

// Owner creates a venue
router.post('/', requireLogin, requireRole('OWNER'), async (req, res) => {
  const { name, description, address, city, state, pincode,
    capacity, pricePerDay, amenities, photos } = req.body;

  const venue = await db.venue.create({
    data: {
      ownerId: req.user.id,
      name, description, address, city, state, pincode,
      capacity: Number(capacity),
      pricePerDay: Number(pricePerDay),
      amenities: amenities || [],
      photos: photos || [],
      status: 'DRAFT',
    },
  });

  res.json({ message: 'Venue created as draft', venue });
});

// Owner submits venue for review
router.patch('/:id/submit', requireLogin, requireRole('OWNER'), async (req, res) => {
  const venue = await db.venue.findUnique({ where: { id: req.params.id } });

  if (!venue) return res.status(404).json({ message: 'Venue not found' });
  if (venue.ownerId !== req.user.id) return res.status(403).json({ message: 'Not your venue' });

  const updated = await db.venue.update({
    where: { id: req.params.id },
    data: { status: 'PENDING_REVIEW' },
  });

  res.json({ message: 'Submitted for review', venue: updated });
});

// Owner sees their own venues
router.get('/my/venues', requireLogin, requireRole('OWNER'), async (req, res) => {
  const venues = await db.venue.findMany({
    where: { ownerId: req.user.id },
  });

  res.json({ venues });
});

// Admin approves venue
router.patch('/:id/approve', requireLogin, requireRole('ADMIN'), async (req, res) => {
  const venue = await db.venue.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE', approvedAt: new Date(), approvedBy: req.user.id },
  });

  res.json({ message: 'Venue approved', venue });
});

// Admin rejects venue
router.patch('/:id/reject', requireLogin, requireRole('ADMIN'), async (req, res) => {
  const venue = await db.venue.update({
    where: { id: req.params.id },
    data: { status: 'DRAFT' },
  });

  res.json({ message: 'Venue rejected', venue });
});

// Admin sees pending venues
router.get('/admin/pending', requireLogin, requireRole('ADMIN'), async (req, res) => {
  const venues = await db.venue.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { owner: { select: { name: true, email: true } } },
  });

  res.json({ venues });
});

module.exports = router;