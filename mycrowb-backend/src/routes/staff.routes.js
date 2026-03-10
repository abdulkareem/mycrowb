const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  listStaff,
  createStaff,
  toggleStaffStatus,
  deleteStaff
} = require('../controllers/staff.controller');

router.get('/', authorize('ADMIN'), listStaff);
router.post('/', authorize('ADMIN'), upload.single('photo'), createStaff);
router.patch('/:id/status', authorize('ADMIN'), toggleStaffStatus);
router.delete('/:id', authorize('ADMIN'), deleteStaff);

module.exports = router;
