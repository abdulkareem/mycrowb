const router = require('express').Router();
const {
  sendViaWhatsappPlatform,
  receiveWhatsappWebhook
} = require('../controllers/whatsapp-integration.controller');

router.post('/send', sendViaWhatsappPlatform);
router.post('/webhook', receiveWhatsappWebhook);

module.exports = router;
