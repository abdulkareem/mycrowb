const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { createRating, listRatings } = require('../controllers/rating.controller');

router.post('/', authorize('BARBER'), createRating);
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), listRatings);

module.exports = router;
