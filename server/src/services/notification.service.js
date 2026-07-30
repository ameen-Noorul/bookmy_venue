const prisma = require('../db/prismaClient');

async function notifyOwnerOfBooking(ownerId, venueName, eventDate) {
  return prisma.notification.create({
    data: {
      ownerId,
      message: `New confirmed booking for "${venueName}" on ${eventDate.toDateString()}`,
    },
  });
}

async function getNotificationsForOwner(ownerId) {
  return prisma.notification.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { notifyOwnerOfBooking, getNotificationsForOwner };