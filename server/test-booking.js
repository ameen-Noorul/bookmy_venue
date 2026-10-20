/**
 * Creates ONE booking directly through the service (no HTTP) on a random future
 * date, so it never collides with an earlier run.
 * Run from server/:  node test-booking.js
 * Then check the worker terminal for the notification job.
 */

const { createBooking } = require('./src/services/booking.service');

// Real ids from your database (same ones as before).
const TEST_USER_ID = '0779b010-f1f9-43ec-91e9-1829ff50c0a6';
const TEST_VENUE_ID = 'a6075ba2-80eb-48a7-9431-a759ddf7a516';

// Random day between 2028 and ~2036: a different date on every run.
const eventDay = new Date(Date.UTC(2028, 0, 1) + Math.floor(Math.random() * 3000) * 86400000);

async function main() {
  console.log(`Creating test booking for ${eventDay.toISOString().slice(0, 10)}...`);

  const booking = await createBooking(
    {
      venueId: TEST_VENUE_ID,
      eventDate: eventDay,
      eventEndDate: eventDay,
      eventType: 'Wedding',
      guestCount: 100,
    },
    TEST_USER_ID,
  );

  console.log(`PASS: booking created ${booking.id} (${booking.status})`);
  console.log('Now check your worker terminal for the notification job.');
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL: could not create booking:', err.message);
  process.exit(1);
});