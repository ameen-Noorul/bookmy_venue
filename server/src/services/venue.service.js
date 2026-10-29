const prisma = require("../db/prismaClient");
const AppError = require("../utils/AppError");
const cache = require("../utils/cache");

// Any logged-in user can submit a venue, they don't need to be an OWNER
// yet. For this MVP we skip the DRAFT step and go straight to PENDING_REVIEW.
async function createVenue(data, submitterId) {
  return prisma.venue.create({
    data: { ...data, ownerId: submitterId, status: "PENDING_REVIEW" },
  });
}

// Public: fetch a single venue by id, for a venue detail page.
async function getVenueById(venueId) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new AppError("Venue not found", 404);
  }
  return venue;
}

// Owner: update their own venue. Ownership was already verified by the
// authorizeVenueOwner middleware, and Zod's .strict() schema already
// rejected any fields that must not be changed.
async function updateVenue(venueId, data) {
  const venue = await prisma.venue.update({
    where: { id: venueId },
    data,
  });
  cache.clear(); // a public listing may show stale name/price/photos otherwise
  return venue;
}

// Owner: delete their own venue. Ownership already verified upstream.
async function deleteVenue(venueId) {
  await prisma.venue.delete({ where: { id: venueId } });
  cache.clear();
}

// Public listing: only ever returns ACTIVE (approved) venues.
async function getApprovedVenues({ page, limit, city }) {
  const cacheKey = `venues:${page}:${limit}:${city || "all"}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const skip = (page - 1) * limit;
  const where = { status: "ACTIVE", ...(city ? { city } : {}) };

  const [venues, total] = await Promise.all([
    prisma.venue.findMany({ where, skip, take: limit }),
    prisma.venue.count({ where }),
  ]);

  const result = {
    venues,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };

  cache.set(cacheKey, result, 30 * 1000); // cache for 30 seconds
  return result;
}

// A user checking on their own submissions, including PENDING_REVIEW/SUSPENDED ones.
async function getVenuesByOwner(ownerId) {
  return prisma.venue.findMany({ where: { ownerId } });
}

// ADMIN-only: list everything still awaiting a decision, with who submitted it.
async function getPendingVenues() {
  return prisma.venue.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// ADMIN-only: approve (ACTIVE) or reject (SUSPENDED) a specific venue.
async function reviewVenue(venueId, status, adminId) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new AppError("Venue not found", 404);
  }

  // Rejection only touches the venue; the submitter keeps their role.
  if (status === "SUSPENDED") {
    cache.clear();
    return prisma.venue.update({
      where: { id: venueId },
      data: { status, approvedBy: adminId },
    });
  }

  // Approval touches TWO rows together: the venue (status + approvedAt +
  // approvedBy) and the submitter's role. $transaction makes sure a crash
  // between the two writes can't leave a live venue with a non-owner.
  const [updatedVenue] = await prisma.$transaction([
    prisma.venue.update({
      where: { id: venueId },
      data: { status, approvedAt: new Date(), approvedBy: adminId },
    }),
    prisma.user.update({
      where: { id: venue.ownerId },
      data: { role: "OWNER" },
    }),
  ]);
  cache.clear();
  return updatedVenue;
}

module.exports = {
  createVenue,
  getApprovedVenues,
  getVenuesByOwner,
  getPendingVenues,
  reviewVenue,
  getVenueById,
  updateVenue,
  deleteVenue,
};