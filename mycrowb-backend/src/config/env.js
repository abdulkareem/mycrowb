require('dotenv').config();

const required = ['JWT_SECRET'];
required.forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
});

const parseTrustProxy = (value) => {
  if (value === undefined || value === null || value === '') return 1;

  if (value === 'true') return true;
  if (value === 'false') return false;

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) return asNumber;

  return value;
};


module.exports = {
  port: Number(process.env.PORT || 8080),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
  smsFallbackSender: process.env.SMS_FALLBACK_SENDER || 'MYCROWB',
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  whatsappApiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0',
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || 'registration_otp',
  whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  osrmBaseUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:8080',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY)
};
