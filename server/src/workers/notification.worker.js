/**
 * Notification worker: separate process that watches the "notification" queue,
 * saves the notification row, then pushes it live to the owner's socket room.
 *
 * Run from server/:  node src/workers/notification.worker.js
 */

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { connection } = require('../queues/notification.queue');
const { notifyOwnerOfBooking } = require('../services/notification.service');
const { initEmitter, emitToUser } = require('../realtime/emitter');

// Dedicated Redis client for publishing socket events to the API instances.
const emitterRedis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
emitterRedis.on('error', (err) => console.error('[worker] emitter redis error:', err.message));
initEmitter(emitterRedis);

const notificationWorker = new Worker(
  'notification',
  async (job) => {
    if (job.name === 'notify-owner-booking') {
      const { ownerId, venueName, eventDate } = job.data;

      // 1. Save the notification row (source of truth).
      const notification = await notifyOwnerOfBooking(ownerId, venueName, new Date(eventDate));

      // 2. Push it live. A failed push must never fail the job: the row is already saved.
      try {
        emitToUser(ownerId, 'notification:new', JSON.parse(JSON.stringify(notification)));
      } catch (err) {
        console.warn('[worker] live push failed:', err.message);
      }
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
  console.error(`[worker] Job ${job && job.id} (${job && job.name}) failed:`, err.message);
});

// Without this listener, a Redis hiccup can crash the whole process.
notificationWorker.on('error', (err) => {
  console.error('[worker] worker error:', err.message);
});

// Last-resort logging so a crash always leaves a reason in the terminal.
process.on('uncaughtException', (err) => {
  console.error('[worker] UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[worker] UNHANDLED REJECTION:', reason);
});

// Clean shutdown on Ctrl+C.
process.on('SIGINT', async () => {
  console.log('[worker] shutting down...');
  await notificationWorker.close();
  process.exit(0);
});

console.log('Notification worker started, waiting for jobs...');