const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const {
  uploadShopsCsv,
  listShops,
  exportShops,
  updateShop,
  toggleShop,
  deleteShop,
  getMyShop,
  updateMyShopProfile,
  requestProfileEdit,
  setProfileEditApproval
} = require('../controllers/shop.controller');

router.post('/upload-csv', authorize('ADMIN'), upload.single('file'), uploadShopsCsv);
router.get('/', authorize('ADMIN', 'SERVICE_STAFF'), listShops);
router.get('/export', authorize('ADMIN'), exportShops);
router.patch('/:id', authorize('ADMIN'), updateShop);
router.patch('/:id/toggle', authorize('ADMIN'), toggleShop);
router.delete('/:id', authorize('ADMIN'), deleteShop);
router.get('/me', authorize('BARBER'), getMyShop);
router.put('/me/profile', authorize('BARBER'), updateMyShopProfile);
router.post('/me/request-edit', authorize('BARBER'), requestProfileEdit);
router.patch('/:id/edit-request', authorize('ADMIN'), setProfileEditApproval);

module.exports = router;
