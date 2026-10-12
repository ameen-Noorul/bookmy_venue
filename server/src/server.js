const http = require('http');
const app = require('./app');
const redisClient = require('./config/redis');
const { initSocket } = require('./realtime/socket');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Wait until Redis is ready before accepting requests.
    await redisClient.connect();
    console.log('Redis connected');

    // Socket.IO's Redis adapter needs a second connection for subscribing.
    const subClient = redisClient.duplicate();
    await subClient.connect();

    // Express and Socket.IO share one HTTP server and one port.
    const server = http.createServer(app);
    initSocket(server, redisClient, subClient);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
};

startServer();