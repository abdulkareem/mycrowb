const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { markCollection, markPayment, listMyCollections } = require('../controllers/collection.controller');

router.get('/my', authorize('BARBER'), listMyCollections);
router.patch('/:id/collect', authorize('SERVICE_STAFF', 'ADMIN'), upload.single('imageProof'), markCollection);
router.patch('/:id/pay', authorize('ADMIN'), markPayment);

module.exports = router;
