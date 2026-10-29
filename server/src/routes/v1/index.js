const express = require("express");
const router = express.Router();

router.use("/auth", require("../auth.routes"));
router.use("/venues", require("../venue.routes"));
router.use("/bookings", require("../booking.routes"));
router.use("/notifications", require("../notification.routes"));
router.use("/users", require("../user.routes"));

router.get("/", (req, res) => {
  res.json({ message: "BookMyVenue API v1 working" });
});

module.exports = router;