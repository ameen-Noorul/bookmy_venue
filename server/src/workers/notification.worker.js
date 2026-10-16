/**
 * Notification worker: separate process that watches the "notification" queue,
 * saves the notification row, then pushes it live to the owner's socket room.
 *
 * Run with: node src/workers/notification.worker.js
 */

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { connection } = require('../queues/notification.queue');
const { notifyOwnerOfBooking } = require('../services/notification.service');
const { initEmitter, emitToUser } = require('../realtime/emitter');

// Dedicated Redis client for publishing socket events to the API instances.
initEmitter(new IORedis(process.env.REDIS_URL || 'redis://localhost:6379'));

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
  console.error(`[worker] Job ${job.id} (${job.name}) failed:`, err.message);
});

console.log('Notification worker started, waiting for jobs...');