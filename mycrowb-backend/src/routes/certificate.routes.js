const router = require('express').Router();
const { authorize } = require('../middleware/auth.middleware');
const { issueCertificate, verifyCertificate } = require('../controllers/certificate.controller');

router.post('/', authorize('ADMIN'), issueCertificate);
router.get('/verify/:code', verifyCertificate);

module.exports = router;
