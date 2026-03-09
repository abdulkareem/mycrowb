const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { issueCertificate, verifyCertificate, getMyLatestCertificate } = require('../controllers/certificate.controller');

router.post('/', authorize('ADMIN'), issueCertificate);
router.get('/verify/:code', verifyCertificate);
router.get('/my/latest', authorize('BARBER'), getMyLatestCertificate);

module.exports = router;
