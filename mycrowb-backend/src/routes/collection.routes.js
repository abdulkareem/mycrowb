const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  markCollection,
  markPayment,
  verifyShopPayment,
  markCollectionByShopMonth,
  issueReceipt,
  listAdminPayments,
  listMyCollections,
  listStaffRouteStatuses
} = require('../controllers/collection.controller');

router.get('/my', authorize('BARBER'), listMyCollections);
router.get('/staff/route-status', authorize('SERVICE_STAFF', 'ADMIN', 'SUPER_ADMIN'), listStaffRouteStatuses);
router.get('/admin/payments', authorize('ADMIN', 'SUPER_ADMIN'), listAdminPayments);
router.patch('/admin/payments/:shopId/:month/verify', authorize('ADMIN', 'SUPER_ADMIN'), verifyShopPayment);
router.patch('/admin/payments/:shopId/:month/issue-receipt', authorize('ADMIN', 'SUPER_ADMIN'), issueReceipt);
router.patch('/shop/:shopId/:month/collect', authorize('SERVICE_STAFF', 'ADMIN'), upload.single('imageProof'), markCollectionByShopMonth);
router.patch('/:id/collect', authorize('SERVICE_STAFF', 'ADMIN'), upload.single('imageProof'), markCollection);
router.patch('/:id/pay', authorize('ADMIN', 'SUPER_ADMIN'), markPayment);

module.exports = router;
