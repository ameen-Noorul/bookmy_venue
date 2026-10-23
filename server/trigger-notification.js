const prisma = require('./src/db/prismaClient');
const { notificationQueue, connection } = require('./src/queues/notification.queue');

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: node trigger-notification.js owner@email.com');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`No user with email ${email}`);
    process.exit(1);
  }

  await notificationQueue.add('notify-owner-booking', {
    ownerId: user.id,
    venueName: 'Demo Hall',
    eventDate: new Date().toISOString(),
  });
  console.log(`Queued a notification for ${email}. Watch the bell.`);

  await notificationQueue.close();
  connection.disconnect();
  await prisma.$disconnect();
})();