const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { issueCertificate, cancelCertificateForShop, verifyCertificate, getMyLatestCertificate } = require('../controllers/certificate.controller');

router.post('/', authorize('ADMIN'), issueCertificate);
router.delete('/shop/:shopId', authorize('ADMIN'), cancelCertificateForShop);
router.get('/verify/:code', verifyCertificate);
router.get('/my/latest', authorize('BARBER'), getMyLatestCertificate);

module.exports = router;
