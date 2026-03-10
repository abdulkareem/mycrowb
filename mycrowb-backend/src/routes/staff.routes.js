const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  listStaff,
  createStaff,
  toggleStaffStatus,
  deleteStaff
} = require('../controllers/staff.controller');

router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), listStaff);
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), upload.single('photo'), createStaff);
router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN'), toggleStaffStatus);
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), deleteStaff);

module.exports = router;
