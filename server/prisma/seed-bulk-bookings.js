/**
 * Bulk seed script — matches the real schema.prisma (users/venues/bookings).
 * Generates large fake datasets so EXPLAIN ANALYZE has something real to chew on.
 *
 * Install faker first:
 *   npm install --save-dev @faker-js/faker
 *
 * Run with:
 *   node prisma/seed-bulk-bookings.js
 */

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

const NUM_USERS = 2000;   // role: USER
const NUM_OWNERS = 300;   // role: OWNER — venues need real owners
const NUM_VENUES = 500;
const NUM_BOOKINGS = 150000;

const BATCH_SIZE = 5000;

const AMENITY_POOL = ['Parking', 'AC', 'Catering', 'DJ', 'Stage', 'Generator', 'Wifi', 'Valet'];

async function seedUsers() {
  console.log(`Seeding ${NUM_USERS} users + ${NUM_OWNERS} owners...`);

  const users = [];
  for (let i = 0; i < NUM_USERS; i++) {
    users.push({
      email: faker.internet.email({ firstName: `user${i}` }).toLowerCase(),
      name: faker.person.fullName(),
      password: 'hashed_placeholder',
      role: 'USER',
    });
  }
  for (let i = 0; i < NUM_OWNERS; i++) {
    users.push({
      email: faker.internet.email({ firstName: `owner${i}` }).toLowerCase(),
      name: faker.person.fullName(),
      password: 'hashed_placeholder',
      role: 'OWNER',
    });
  }

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    await prisma.user.createMany({
      data: users.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
    console.log(`  Inserted users ${i} - ${i + BATCH_SIZE}`);
  }
}

async function seedVenues() {
  console.log(`Seeding ${NUM_VENUES} venues...`);

  const ownerIds = (
    await prisma.user.findMany({ where: { role: 'OWNER' }, select: { id: true } })
  ).map(o => o.id);

  const venues = [];
  for (let i = 0; i < NUM_VENUES; i++) {
    venues.push({
      ownerId: faker.helpers.arrayElement(ownerIds),
      name: faker.company.name() + ' Hall',
      description: faker.lorem.sentences(2),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      pincode: faker.location.zipCode('######'),
      latitude: Number(faker.location.latitude()),
      longitude: Number(faker.location.longitude()),
      capacity: faker.number.int({ min: 20, max: 2000 }),
      pricePerDay: faker.number.int({ min: 5000, max: 200000 }),
      amenities: faker.helpers.arrayElements(AMENITY_POOL, { min: 2, max: 5 }),
      photos: [faker.image.urlPicsumPhotos()],
      status: 'ACTIVE',
    });
  }

  for (let i = 0; i < venues.length; i += BATCH_SIZE) {
    await prisma.venue.createMany({
      data: venues.slice(i, i + BATCH_SIZE),
      skipDuplicates: true,
    });
    console.log(`  Inserted venues ${i} - ${i + BATCH_SIZE}`);
  }
}

async function seedBookings() {
  console.log(`Seeding up to ${NUM_BOOKINGS} bookings...`);

  const userIds = (
    await prisma.user.findMany({ where: { role: 'USER' }, select: { id: true } })
  ).map(u => u.id);
  const venueIds = (await prisma.venue.findMany({ select: { id: true } })).map(v => v.id);

  const eventTypes = ['Wedding', 'Birthday', 'Conference', 'Reception', 'Concert'];
  const statuses = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED'];

  let batch = [];
  let inserted = 0;

  for (let i = 0; i < NUM_BOOKINGS; i++) {
    const start = faker.date.between({ from: '2024-01-01', to: '2027-01-01' });
    const end = new Date(start); // single-day bookings keep overlap collisions low

    const totalAmount = faker.number.int({ min: 5000, max: 500000 });
    const platformFee = Math.round(totalAmount * 0.1);
    const ownerAmount = totalAmount - platformFee;

    batch.push({
      userId: faker.helpers.arrayElement(userIds),
      venueId: faker.helpers.arrayElement(venueIds),
      eventDate: start,
      eventEndDate: end,
      eventType: faker.helpers.arrayElement(eventTypes),
      guestCount: faker.number.int({ min: 10, max: 1500 }),
      totalAmount,
      platformFee,
      ownerAmount,
      status: faker.helpers.arrayElement(statuses),
      policySnapshot: { cancellationWindowDays: 7, refundPercent: 80 }, // required Json field
    });

    if (batch.length === BATCH_SIZE) {
      // skipDuplicates covers both the @@unique([venueId, eventDate]) constraint
      // and the Postgres exclusion constraint from Phase 1 — conflicting rows are
      // silently dropped rather than crashing the whole batch.
      await prisma.booking.createMany({ data: batch, skipDuplicates: true });
      inserted += batch.length;
      console.log(`  Processed bookings: ${inserted}/${NUM_BOOKINGS}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.booking.createMany({ data: batch, skipDuplicates: true });
    inserted += batch.length;
    console.log(`  Processed bookings: ${inserted}/${NUM_BOOKINGS}`);
  }

  const actualCount = await prisma.booking.count();
  console.log(`Actual booking rows in DB (after skipping conflicts): ${actualCount}`);
}

async function main() {
  console.time('Total seed time');
  await seedUsers();
  await seedVenues();
  await seedBookings();
  console.timeEnd('Total seed time');
  console.log('Done. Now go run EXPLAIN ANALYZE on your real queries.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });