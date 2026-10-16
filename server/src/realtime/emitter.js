const { Emitter } = require("@socket.io/redis-emitter");

let emitter = null;

// Call once in a non-API process (e.g. the worker) with an already-connected Redis client.
function initEmitter(redisClient) {
  emitter = new Emitter(redisClient);
  return emitter;
}

// Same shape as emitToUser in socket.js, so callers don't care which process they're in.
function emitToUser(userId, event, payload) {
  if (!emitter) throw new Error("Emitter not initialised: call initEmitter(redisClient) first");
  emitter.to(`user:${userId}`).emit(event, payload);
}

module.exports = { initEmitter, emitToUser };