const router = require('express').Router();
const userController = require('../controllers/user.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authorizeRoles } = require('../middleware/authorize');
const { listUsersSchema, banUserSchema, setRoleSchema } = require('../schemas/user.schema');

// Everything in this file is ADMIN-only.
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/', validate(listUsersSchema), userController.list);
router.patch('/:userId/ban', validate(banUserSchema), userController.ban);
router.patch('/:userId/role', validate(setRoleSchema), userController.setRole);

module.exports = router;