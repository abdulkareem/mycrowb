const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { predictShop } = require('../controllers/prediction.controller');

router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), predictShop);

module.exports = router;
