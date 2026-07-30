const catchAsync = require('../utils/catchAsync');
const authService = require('../services/auth.service');

const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ status: 'success', data: result });
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ status: 'success', data: result });
});

// A small "who am I" endpoint — useful for a frontend to check whether a
// stored token is still valid and fetch the current user's own data.
const getMe = catchAsync(async (req, res) => {
  const { password, ...safeUser } = req.user;
  res.status(200).json({ status: 'success', data: safeUser });
});

module.exports = { register, login, getMe };