const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { getOptimizedRoute } = require('../controllers/routing.controller');

router.get('/optimize', authorize('SERVICE_STAFF', 'ADMIN'), getOptimizedRoute);

module.exports = router;
