// Demo data: 1 admin, 2 owners, 1 customer, 10 Kerala venues, 4 sample bookings.
// Safe to run repeatedly: users are upserted, venues/bookings are skipped if they exist.
const { PrismaClient, VenueStatus, BookingStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Enum value names differ between projects, so resolve them from the real enums.
const firstOf = (enumObj, names) => {
  const found = names.find((n) => enumObj && enumObj[n]);
  if (!found) throw new Error(`None of ${names.join('/')} exist. Enum has: ${Object.keys(enumObj || {})}`);
  return enumObj[found];
};
const VENUE_LIVE = firstOf(VenueStatus, ['ACTIVE', 'APPROVED', 'PUBLISHED', 'LIVE']);
const BOOKING_PENDING = firstOf(BookingStatus, ['PENDING']);
const BOOKING_CONFIRMED = firstOf(BookingStatus, ['CONFIRMED', 'APPROVED', 'ACCEPTED']);

const day = (offset) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset));
};
const photos = (slug) => [1, 2, 3].map((n) => `https://picsum.photos/seed/${slug}-${n}/1200/800`);

const POLICY = {
  tiers: [
    { daysBefore: 14, refundPercent: 100 },
    { daysBefore: 7, refundPercent: 50 },
    { daysBefore: 0, refundPercent: 0 },
  ],
};

const VENUES = [
  { slug: 'marine-drive-grand', name: 'Marine Drive Grand Ballroom', city: 'Kochi', pincode: '682031', address: 'Marine Drive, Ernakulam', lat: 9.9816, lng: 76.2759, capacity: 600, price: 85000, owner: 1, amenities: ['AC', 'Parking', 'Stage', 'Catering', 'Wi-Fi'], description: 'Waterfront ballroom with a full stage and in-house catering, ideal for weddings and receptions.' },
  { slug: 'backwater-lawn', name: 'Backwater Lawn Resort', city: 'Alappuzha', pincode: '688001', address: 'Punnamada Lake Road', lat: 9.4981, lng: 76.3388, capacity: 400, price: 65000, owner: 1, amenities: ['Open Lawn', 'Parking', 'Catering', 'Rooms'], description: 'Open lawn on the backwaters with lakeside photo spots and on-site rooms for guests.' },
  { slug: 'hill-view-hall', name: 'Hill View Convention Hall', city: 'Munnar', pincode: '685612', address: 'Tea Estate Road, Munnar', lat: 10.0889, lng: 77.0595, capacity: 250, price: 45000, owner: 2, amenities: ['AC', 'Parking', 'Projector', 'Wi-Fi'], description: 'Mountain-view hall for corporate retreats, small weddings and birthday parties.' },
  { slug: 'malabar-palace', name: 'Malabar Palace Banquet', city: 'Kozhikode', pincode: '673001', address: 'Mavoor Road', lat: 11.2588, lng: 75.7804, capacity: 800, price: 95000, owner: 1, amenities: ['AC', 'Parking', 'Stage', 'Catering', 'Generator'], description: 'Large air-conditioned banquet with a 800-seat main hall and separate dining space.' },
  { slug: 'capital-courtyard', name: 'Capital Courtyard', city: 'Thiruvananthapuram', pincode: '695001', address: 'MG Road, Palayam', lat: 8.5069, lng: 76.9558, capacity: 350, price: 55000, owner: 2, amenities: ['AC', 'Parking', 'Projector', 'Wi-Fi'], description: 'Central city venue suited to conferences, engagements and cultural events.' },
  { slug: 'pooram-pavilion', name: 'Pooram Pavilion', city: 'Thrissur', pincode: '680001', address: 'Round South, Thrissur', lat: 10.5276, lng: 76.2144, capacity: 500, price: 60000, owner: 2, amenities: ['AC', 'Parking', 'Stage', 'Catering'], description: 'Traditional-style pavilion near the Vadakkunnathan temple with a grand stage.' },
  { slug: 'fort-garden', name: 'Fort Garden Events', city: 'Kannur', pincode: '670001', address: 'Fort Road, Kannur', lat: 11.8745, lng: 75.3704, capacity: 300, price: 40000, owner: 1, amenities: ['Open Lawn', 'Parking', 'Catering'], description: 'Garden venue beside the sea fort, popular for outdoor receptions and parties.' },
  { slug: 'palakkad-gap-hall', name: 'Palakkad Gap Hall', city: 'Palakkad', pincode: '678001', address: 'Stadium Bypass Road', lat: 10.7867, lng: 76.6548, capacity: 450, price: 50000, owner: 2, amenities: ['AC', 'Parking', 'Stage', 'Generator'], description: 'Spacious hall with ample parking, a short drive from the town centre.' },
  { slug: 'rubber-estate-resort', name: 'Rubber Estate Resort', city: 'Kottayam', pincode: '686001', address: 'Kumarakom Road', lat: 9.5916, lng: 76.5222, capacity: 200, price: 38000, owner: 1, amenities: ['Open Lawn', 'Rooms', 'Parking', 'Wi-Fi'], description: 'Quiet estate resort for intimate weddings, retreats and family gatherings.' },
  { slug: 'tirur-celebration-centre', name: 'Tirur Celebration Centre', city: 'Malappuram', pincode: '676101', address: 'Station Road, Tirur', lat: 10.9144, lng: 75.9214, capacity: 700, price: 70000, owner: 2, amenities: ['AC', 'Parking', 'Stage', 'Catering', 'Generator'], description: 'Large air-conditioned auditorium with dining hall, built for big family functions.' },
];

async function upsertUser(email, name, role) {
  return prisma.user.upsert({
    where: { email },
    update: { role, isBanned: false },
    create: { email, name, role, password: await bcrypt.hash('password123', 10) },
  });
}

async function main() {
  const admin = await upsertUser('test@example.com', 'Test Admin', 'ADMIN');
  const owner1 = await upsertUser('owner@example.com', 'Rahul Menon', 'OWNER');
  const owner2 = await upsertUser('owner2@example.com', 'Priya Nair', 'OWNER');
  const customer = await upsertUser('customer@example.com', 'Anand Kumar', 'USER');
  const owners = { 1: owner1, 2: owner2 };

  const created = [];
  for (const v of VENUES) {
    const ownerId = owners[v.owner].id;
    let venue = await prisma.venue.findFirst({ where: { name: v.name, ownerId } });
    if (!venue) {
      venue = await prisma.venue.create({
        data: {
          ownerId,
          name: v.name,
          description: v.description,
          address: v.address,
          city: v.city,
          state: 'Kerala',
          pincode: v.pincode,
          latitude: v.lat,
          longitude: v.lng,
          capacity: v.capacity,
          pricePerDay: v.price,
          amenities: v.amenities,
          photos: photos(v.slug),
          status: VENUE_LIVE,
          cancellationPolicy: POLICY,
          rules: 'No loud music after 10 PM. Decorations must not damage walls.',
          approvedAt: new Date(),
          approvedBy: admin.id,
        },
      });
    }
    created.push(venue);
  }
  console.log(`Venues ready: ${created.length}`);

  const SAMPLE = [
    { venue: 0, start: 20, days: 1, type: 'Wedding Reception', guests: 450, status: BOOKING_CONFIRMED },
    { venue: 2, start: 35, days: 2, type: 'Corporate Retreat', guests: 120, status: BOOKING_PENDING },
    { venue: 4, start: 12, days: 1, type: 'Engagement', guests: 200, status: BOOKING_PENDING },
    { venue: 6, start: -15, days: 1, type: 'Birthday Party', guests: 150, status: BOOKING_CONFIRMED },
  ];
  for (const b of SAMPLE) {
    const venue = created[b.venue];
    const eventDate = day(b.start);
    const eventEndDate = day(b.start + b.days - 1);
    const exists = await prisma.booking.findFirst({
      where: { venueId: venue.id, userId: customer.id, eventDate },
    });
    if (exists) continue;
    const total = Number(venue.pricePerDay) * b.days;
    const fee = Math.round(total * 0.1 * 100) / 100;
    await prisma.booking.create({
      data: {
        venueId: venue.id,
        userId: customer.id,
        eventDate,
        eventEndDate,
        eventType: b.type,
        guestCount: b.guests,
        totalAmount: total,
        platformFee: fee,
        ownerAmount: total - fee,
        status: b.status,
        policySnapshot: POLICY,
      },
    });
  }
  console.log('Sample bookings ready: 4');

  console.log('\nDemo logins (password for all: password123)');
  console.log('  Admin:    test@example.com');
  console.log('  Owner 1:  owner@example.com');
  console.log('  Owner 2:  owner2@example.com');
  console.log('  Customer: customer@example.com');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());