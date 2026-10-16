const prisma = require("./src/db/prismaClient");
const { notificationQueue, connection } = require("./src/queues/notification.queue");

(async () => {
  const clean = process.argv.includes("--clean");

  const jobs = await notificationQueue.getJobs(["completed", "failed", "waiting", "delayed", "active"]);
  jobs.sort((a, b) => Number(a.id) - Number(b.id));
  console.log(`Jobs in queue: ${jobs.length}\n`);

  for (const job of jobs) {
    const state = await job.getState();
    const { ownerId, venueName } = job.data;
    let exists = "n/a";
    try {
      const user = await prisma.user.findUnique({ where: { id: ownerId } });
      exists = user ? `YES (${user.email})` : "NO  <-- this is why it failed";
    } catch (e) {
      exists = `lookup error: ${e.message.split("\n").pop()}`;
    }
    console.log(`Job ${job.id} [${state}] venue="${venueName}" ownerId=${ownerId} userExists=${exists}`);
  }

  if (clean) {
    await notificationQueue.obliterate({ force: true });
    console.log("\nQueue wiped.");
  } else {
    console.log("\n(Run with --clean to wipe the queue.)");
  }

  await notificationQueue.close();
  connection.disconnect();
  await prisma.$disconnect();
})();