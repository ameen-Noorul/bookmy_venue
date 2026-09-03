/**
 * The WORKER — a separate process that watches the "notification" queue
 * and actually calls your real notifyOwnerOfBooking() function when a
 * job shows up.
 *
 * Place this at: server/src/workers/notification.worker.js
 * Run it with:   node src/workers/notification.worker.js
 * (as its own process, alongside your normal API server)
 */

const { Worker } = require('bullmq');
const { connection } = require('../queues/notification.queue');
const { notifyOwnerOfBooking } = require('../services/notification.service');

const notificationWorker = new Worker(
  'notification',
  async (job) => {
    if (job.name === 'notify-owner-booking') {
      const { ownerId, venueName, eventDate } = job.data;

      // This is your REAL, already-working function — we're not
      // reimplementing anything, just calling it from a background
      // process instead of directly inside the booking request.
      await notifyOwnerOfBooking(ownerId, venueName, new Date(eventDate));
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

notificationWorker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} (${job.name}) completed`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job.id} (${job.name}) failed:`, err.message);
});

console.log('Notification worker started, waiting for jobs...');