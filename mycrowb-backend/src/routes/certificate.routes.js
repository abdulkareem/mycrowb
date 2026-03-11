const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { issueCertificate, cancelCertificateForShop, verifyCertificate, getMyLatestCertificate, downloadMyLatestCertificate } = require('../controllers/certificate.controller');

router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), issueCertificate);
router.delete('/shop/:shopId', authorize('ADMIN', 'SUPER_ADMIN'), cancelCertificateForShop);
router.get('/verify/:code', verifyCertificate);
router.get('/my/latest', authorize('BARBER'), getMyLatestCertificate);
router.get('/my/latest/download', authorize('BARBER'), downloadMyLatestCertificate);

module.exports = router;
