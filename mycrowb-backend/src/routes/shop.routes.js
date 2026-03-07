const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { uploadShopsCsv, listShops, updateShop, toggleShop } = require('../controllers/shop.controller');

router.post('/upload-csv', authorize('ADMIN'), upload.single('file'), uploadShopsCsv);
router.get('/', authorize('ADMIN', 'SERVICE_STAFF'), listShops);
router.patch('/:id', authorize('ADMIN'), updateShop);
router.patch('/:id/toggle', authorize('ADMIN'), toggleShop);

module.exports = router;
