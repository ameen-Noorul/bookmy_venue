const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // BullMQ requires this setting
});

const notificationQueue = new Queue('notification', { connection });

module.exports = { notificationQueue, connection };