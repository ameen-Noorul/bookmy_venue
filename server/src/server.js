const app = require('./app');
const redisClient = require('./config/redis');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Wait until Redis is ready before accepting requests.
    await redisClient.connect();

    console.log('Redis connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start application:', err);
    process.exit(1);
  }
};

startServer();