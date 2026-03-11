const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const {
  listAuthorizedAdmins,
  createAuthorizedAdmin,
  updateAuthorizedAdmin,
  deleteAuthorizedAdmin,
  listLoginActivities
} = require('../controllers/super-admin.controller');

router.get('/admin-numbers', authorize('SUPER_ADMIN'), listAuthorizedAdmins);
router.post('/admin-numbers', authorize('SUPER_ADMIN'), createAuthorizedAdmin);
router.patch('/admin-numbers/:id', authorize('SUPER_ADMIN'), updateAuthorizedAdmin);
router.delete('/admin-numbers/:id', authorize('SUPER_ADMIN'), deleteAuthorizedAdmin);
router.get('/login-activities', authorize('SUPER_ADMIN'), listLoginActivities);

module.exports = router;
