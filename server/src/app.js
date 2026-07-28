const express = require("express");

const authRoutes = require("./routes/auth");
const venueRoutes = require("./venues");
const bookingRoutes = require("./bookings");
const errorHandler = require("./middleware/errorHandler");
const { requireLogin } = require("./requireLogin");

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/venues", requireLogin, venueRoutes);
app.use("/bookings", bookingRoutes);

app.get("/", (req, res) => {
  res.json({ message: "BookMyVenue API working" });
});

// Must be registered last — Express only forwards next(err) to
// middleware defined *after* the route that called it.
app.use(errorHandler);

module.exports = app;
