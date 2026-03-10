const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  markCollection,
  markPayment,
  verifyShopPayment,
  listAdminPayments,
  listMyCollections
} = require('../controllers/collection.controller');

router.get('/my', authorize('BARBER'), listMyCollections);
router.get('/admin/payments', authorize('ADMIN'), listAdminPayments);
router.patch('/admin/payments/:shopId/:month/verify', authorize('ADMIN'), verifyShopPayment);
router.patch('/:id/collect', authorize('SERVICE_STAFF', 'ADMIN'), upload.single('imageProof'), markCollection);
router.patch('/:id/pay', authorize('ADMIN'), markPayment);

module.exports = router;
