const router = require('express').Router();
const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');

router.get(
  '/mine',
  authenticate,
  authorizeRoles('OWNER'),
  notificationController.getMine
);

module.exports = router;