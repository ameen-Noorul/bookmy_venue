-- This is an empty migration.
-- Enables Postgres to use GiST indexes for plain equality checks (venue_id =),
-- not just ranges — required for the constraint below to work.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- "No two rows with the same venue_id can have overlapping date ranges,
-- but only among bookings that are still CONFIRMED or PENDING."
ALTER TABLE "bookings"
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  venue_id WITH =,
  daterange(event_date, event_end_date, '[]') WITH &&
)
WHERE (status IN ('CONFIRMED', 'PENDING'));