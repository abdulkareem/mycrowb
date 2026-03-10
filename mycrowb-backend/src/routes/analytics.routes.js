const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { monthlySummary, trends } = require('../controllers/analytics.controller');

router.get('/monthly-summary', authorize('ADMIN', 'SUPER_ADMIN'), monthlySummary);
router.get('/trends', authorize('ADMIN', 'SUPER_ADMIN'), trends);

module.exports = router;
