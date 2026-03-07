const router = require('express').Router();
const { requestOtp, verifyOtpLogin } = require('../controllers/auth.controller');

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtpLogin);

module.exports = router;
