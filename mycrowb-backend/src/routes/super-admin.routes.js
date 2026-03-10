const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const {
  listAuthorizedAdmins,
  createAuthorizedAdmin,
  listLoginActivities
} = require('../controllers/super-admin.controller');

router.get('/admin-numbers', authorize('SUPER_ADMIN'), listAuthorizedAdmins);
router.post('/admin-numbers', authorize('SUPER_ADMIN'), createAuthorizedAdmin);
router.get('/login-activities', authorize('SUPER_ADMIN'), listLoginActivities);

module.exports = router;
