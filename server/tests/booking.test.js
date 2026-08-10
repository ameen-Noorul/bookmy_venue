const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/db/prismaClient');
const redisClient = require('../src/config/redis');

let token;
let venueId;

beforeAll(async () => {
  // Tests import app.js directly, not server.js — so nothing else ever
  // calls redisClient.connect(). Without this, every Redis call in the
  // idempotency middleware fails closed for the whole test file.
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  const email = `booking-test-${Date.now()}@example.com`;

  const registerRes = await request(app).post('/auth/register').send({
    email,
    password: 'Test1234!',
    name: 'Booking Test User',
  });
  token = registerRes.body.data.accessToken;

  const user = await prisma.user.findUnique({ where: { email } });

  // Created directly via Prisma, not the API — venues submitted through
  // POST /venues start as PENDING_REVIEW and need admin approval before
  // bookings are allowed. For this test we only care about booking logic,
  // so we skip straight to an ACTIVE venue.
  const venue = await prisma.venue.create({
    data: {
      ownerId: user.id,
      name: 'Test Venue',
      address: '123 Test St',
      city: 'Testville',
      state: 'TS',
      pincode: '000000',
      capacity: 100,
      pricePerDay: 5000,
      amenities: [],
      photos: [],
      status: 'ACTIVE',
    },
  });
  venueId = venue.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit(); // close cleanly so Jest doesn't hang waiting on an open handle
});

describe('Booking overlap protection', () => {
  it('rejects an overlapping date range with 409', async () => {
    const first = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        venueId,
        eventDate: '2027-01-01',
        eventEndDate: '2027-01-05',
        eventType: 'Wedding',
        guestCount: 50,
      });

    expect(first.status).toBe(201);

    // Same venue, overlapping range (Jan 3-5 collide with the first booking).
    const second = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        venueId,
        eventDate: '2027-01-03',
        eventEndDate: '2027-01-07',
        eventType: 'Conference',
        guestCount: 30,
      });

    expect(second.status).toBe(409);
  });
});

describe('Idempotency', () => {
  it('returns the same response for a duplicate request with the same key', async () => {
    const idempotencyKey = `test-key-${Date.now()}`;
    const payload = {
      venueId,
      eventDate: '2027-02-01',
      eventEndDate: '2027-02-03',
      eventType: 'Birthday',
      guestCount: 20,
    };

    const first = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);

    const count = await prisma.booking.count({
      where: { venueId, eventDate: new Date('2027-02-01') },
    });
    expect(count).toBe(1);
  });

  it('handles two simultaneous requests with the same key without double-booking', async () => {
    const idempotencyKey = `race-test-${Date.now()}`;
    const payload = {
      venueId,
      eventDate: '2027-03-01',
      eventEndDate: '2027-03-03',
      eventType: 'Concert',
      guestCount: 200,
    };

    await Promise.all([
      request(app).post('/bookings').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', idempotencyKey).send(payload),
      request(app).post('/bookings').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', idempotencyKey).send(payload),
    ]);

    const count = await prisma.booking.count({
      where: { venueId, eventDate: new Date('2027-03-01') },
    });
    expect(count).toBe(1);
  });
});