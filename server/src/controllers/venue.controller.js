const catchAsync = require("../utils/catchAsync");
const venueService = require("../services/venue.service");

const create = catchAsync(async (req, res) => {
  const venue = await venueService.createVenue(req.body, req.user.id);
  res.status(201).json({ status: "success", data: venue });
});

const getApproved = catchAsync(async (req, res) => {
  const result = await venueService.getApprovedVenues(req.query);
  res.status(200).json({ status: "success", ...result });
});

const getMine = catchAsync(async (req, res) => {
  const venues = await venueService.getVenuesByOwner(req.user.id);
  res.status(200).json({ status: "success", data: venues });
});

const getPending = catchAsync(async (req, res) => {
  const venues = await venueService.getPendingVenues();
  res.status(200).json({ status: "success", data: venues });
});

const review = catchAsync(async (req, res) => {
  const venue = await venueService.reviewVenue(
    req.params.venueId,
    req.body.status,
    req.user.id,
  );
  res.status(200).json({ status: "success", data: venue });
});

module.exports = { create, getApproved, getMine, getPending, review };
