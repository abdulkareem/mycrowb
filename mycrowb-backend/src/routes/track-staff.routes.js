const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { getTrackStaffDetails } = require('../controllers/track-staff.controller');

router.get('/:staffId', authorize('SUPER_ADMIN'), getTrackStaffDetails);

module.exports = router;
