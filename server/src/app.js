const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const venueRoutes = require('./routes/venue.routes');
const bookingRoutes = require('./routes/booking.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'fail', message: 'Too many requests, please try again later' },
});
app.use('/auth', authLimiter);

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/venues', venueRoutes);
app.use('/bookings', bookingRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'BookMyVenue API working' });
});

app.use(errorHandler);

module.exports = app;