const catchAsync = require('../utils/catchAsync');
const userService = require('../services/user.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search || undefined;
  const { users, pagination } = await userService.listUsers({ page, limit, search });
  res.status(200).json({ status: 'success', data: users, pagination });
});

const ban = catchAsync(async (req, res) => {
  const user = await userService.setBanned(req.params.userId, req.body.isBanned, req.user.id);
  res.status(200).json({ status: 'success', data: user });
});

const setRole = catchAsync(async (req, res) => {
  const user = await userService.setRole(req.params.userId, req.body.role, req.user.id);
  res.status(200).json({ status: 'success', data: user });
});

module.exports = { list, ban, setRole };