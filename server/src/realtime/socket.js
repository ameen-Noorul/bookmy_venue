const os = require("os");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const jwt = require("jsonwebtoken");
const config = require("../config");

let io = null;

// Same secret that signAccessToken() in utils/tokens.js signs with.
function verifyToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function initSocket(httpServer, pubClient, subClient) {
  io = new Server(httpServer, {
    cors: { origin: config.frontendUrl, credentials: true },
  });

  // Redis adapter: lets all api instances share rooms and events.
  io.adapter(createAdapter(pubClient, subClient));

  // Auth: runs before the connection is accepted.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const payload = verifyToken(token);
      if (!payload.id) return next(new Error("Invalid token payload"));
      socket.data.userId = payload.id;
      socket.data.role = payload.role;
      next();
    } catch (err) {
      console.warn("[socket] token verify failed:", err.message);
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const room = `user:${socket.data.userId}`;
    socket.join(room);
    console.log(`[socket] ${socket.id} connected, joined ${room}`);

    // Test helper: who does the server think I am, and which instance am I on?
    socket.on("whoami", (ack) => {
      if (typeof ack === "function") {
        ack({ userId: socket.data.userId, role: socket.data.role, instance: os.hostname() });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] ${socket.id} disconnected (${reason})`);
    });
  });

  return io;
}

// Used by API code to push events to one user.
function emitToUser(userId, event, payload) {
  if (!io) throw new Error("Socket.IO not initialised");
  io.to(`user:${userId}`).emit(event, payload);
}

module.exports = { initSocket, emitToUser };