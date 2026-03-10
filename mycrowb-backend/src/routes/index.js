const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/shops', require('./shop.routes'));
router.use('/collections', require('./collection.routes'));
router.use('/certificates', require('./certificate.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/routing', require('./routing.routes'));
router.use('/ratings', require('./rating.routes'));
router.use('/predictions', require('./prediction.routes'));
router.use('/staff', require('./staff.routes'));
router.use('/super-admin', require('./super-admin.routes'));

module.exports = router;
