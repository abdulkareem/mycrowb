const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { monthlySummary, trends } = require('../controllers/analytics.controller');

router.get('/monthly-summary', authorize('ADMIN'), monthlySummary);
router.get('/trends', authorize('ADMIN'), trends);

module.exports = router;
