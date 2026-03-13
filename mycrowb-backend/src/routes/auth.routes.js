const router = require('express').Router();
const {
  requestOtp,
  verifyOtpLogin,
  loginWithPin,
  me,
  logout,
  checkAdminEligibility,
  requestMagicLink,
  verifyLoginToken,
  checkUser,
  verifyCode,
  setPin,
  loginWithDevicePin,
  whatsappWebhook
} = require('../controllers/auth.controller');
const { authorize } = require('../middleware/auth.middleware');

router.get('/check-user', checkUser);
router.post('/verify-code', verifyCode);
router.post('/set-pin', setPin);
router.post('/device-login', loginWithDevicePin);
router.post('/whatsapp/webhook', whatsappWebhook);

router.post('/request-otp', requestOtp);
router.post('/request-magic-link', requestMagicLink);
router.post('/verify-otp', verifyOtpLogin);
router.post('/login-pin', loginWithPin);
router.get('/admin-eligibility', checkAdminEligibility);
router.get('/login-token', verifyLoginToken);
router.get('/me', authorize('BARBER', 'SERVICE_STAFF', 'ADMIN', 'SUPER_ADMIN'), me);
router.post('/logout', authorize('BARBER', 'SERVICE_STAFF', 'ADMIN', 'SUPER_ADMIN'), logout);

module.exports = router;
