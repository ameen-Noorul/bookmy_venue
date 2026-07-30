const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notification.service');

const getMine = catchAsync(async (req, res) => {
  const notifications = await notificationService.getNotificationsForOwner(req.user.id);
  res.status(200).json({ status: 'success', data: notifications });
});

module.exports = { getMine };