/**
 * Quick hardcoded script to create ONE test booking directly — no Postman,
 * no frontend, no HTTP at all. This calls your createBooking() function
 * straight from Node, the same way your booking.controller.js would.
 *
 * Place this at: server/test-booking.js (project root of /server, next to
 * package.json — NOT inside src/)
 *
 * Run with:
 *   node test-booking.js
 */

const { createBooking } = require('./src/services/booking.service');

// Replace these two with REAL ids from your database — reuse the same
// ones you already grabbed earlier via psql:
//   SELECT id FROM users WHERE role = 'USER' LIMIT 1;
//   SELECT id FROM venues LIMIT 1;
const TEST_USER_ID = '0779b010-f1f9-43ec-91e9-1829ff50c0a6';
const TEST_VENUE_ID = 'a6075ba2-80eb-48a7-9431-a759ddf7a516';

async function main() {
  console.log('Creating test booking...');

  const booking = await createBooking(
    {
      venueId: TEST_VENUE_ID,
      eventDate: new Date('2027-03-10'),
      eventEndDate: new Date('2027-03-10'),
      eventType: 'Wedding',
      guestCount: 100,
    },
    TEST_USER_ID,
  );

  console.log('Booking created:', booking.id, booking.status);
  console.log('Now check your worker terminal for the notification job.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create booking:', err);
  process.exit(1);
});