const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const venueRoutes = require('./routes/venue.routes');
const bookingRoutes = require('./routes/booking.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// --- Request logging (Module 8) ------------------------------------------
// pino-http auto-logs one line per request/response (method, path, status
// code, response time, a unique request id). This runs FIRST — before
// helmet/cors/etc — so every request gets logged even if it gets rejected by
// something later (e.g. rate limiting), not just successful ones.
app.use(
  pinoHttp({
    logger,
    // NEVER log passwords or tokens, even by accident. redact replaces these
    // paths with "[Redacted]" in the log output instead of the real value —
    // this matters because logs often end up stored/searchable for a long
    // time, or shipped to a third-party log service, and a leaked password
    // sitting in a log file is just as bad as one leaked anywhere else.
    redact: ['req.body.password', 'req.headers.authorization'],
  })
);

// --- Security hardening (Module 7) --------------------------------------
// helmet() strips/adjusts several HTTP response headers that would otherwise
// reveal details about your server (e.g. "X-Powered-By: Express"), making it
// slightly harder for an attacker to fingerprint your stack.
app.use(helmet());

// CORS controls which frontend origins are allowed to call this API from a
// browser. Restricting it to your real frontend's URL (instead of allowing
// everyone, which is the default if you omit `origin`) stops random other
// websites from silently using a logged-in visitor's session against your API.
app.use(cors({ origin: config.frontendUrl }));

// Rate limiting caps how many requests one IP can make in a time window.
// Applied especially to /auth, since login/register are the most common
// target for brute-force password-guessing attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes, expressed in milliseconds
  max: 100,
  message: { status: 'fail', message: 'Too many requests, please try again later' },
});
app.use('/auth', authLimiter);

app.use(express.json());

// --- Routes ---------------------------------------------------------------
app.use('/auth', authRoutes);
app.use('/venues', venueRoutes);
app.use('/bookings', bookingRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'BookMyVenue API working' });
});

// Must be registered LAST — Express only forwards next(err) calls to
// middleware defined *after* the route/middleware that raised them.
app.use(errorHandler);

module.exports = app;