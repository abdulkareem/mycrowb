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
  whatsappPlatformBaseUrl: process.env.WHATSAPP_PLATFORM_BASE_URL || process.env.WHATSAPP_PLATFORM_API_URL || 'https://whatsappplatform-production.up.railway.app',
  whatsappPlatformSendPath: process.env.WHATSAPP_PLATFORM_SEND_PATH || '/api/messages/send',
  whatsappPlatformTimeoutMs: Number(process.env.WHATSAPP_PLATFORM_TIMEOUT_MS || 8000),
  whatsappPlatformApiKey: process.env.APP_API_KEY || process.env.WHATSAPP_PLATFORM_API_KEY,
  whatsappPlatformKeyword: process.env.WHATSAPP_PLATFORM_KEYWORD || 'MYCROWB',
  whatsappPlatformWebhookSecret: process.env.WHATSAPP_PLATFORM_WEBHOOK_SECRET || process.env.WEBHOOK_VERIFY_TOKEN || process.env.APP_API_KEY,
  whatsappPlatformWebhookAllowedIps: String(process.env.WHATSAPP_PLATFORM_WEBHOOK_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean),
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  appApiKey: process.env.APP_API_KEY,
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || process.env.APP_API_KEY,
  whatsappApiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0',
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || 'logincode',
  whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US',
  whatsappTemplateParamMode: process.env.WHATSAPP_TEMPLATE_PARAM_MODE || 'otp_only',
  whatsappTemplateAppName: process.env.WHATSAPP_TEMPLATE_APP_NAME || 'MYCROWB Hair Waste Recycling Network',
  whatsappTemplateBodyParameterName: process.env.WHATSAPP_TEMPLATE_BODY_PARAMETER_NAME || '',
  whatsappTemplateButtonUrlIndex: process.env.WHATSAPP_TEMPLATE_BUTTON_URL_INDEX || '',
  whatsappTemplateButtonUrlValue: process.env.WHATSAPP_TEMPLATE_BUTTON_URL_VALUE || '',
  whatsappMagicTemplateName: process.env.WHATSAPP_MAGIC_TEMPLATE_NAME || 'accountconfirmation',
  whatsappMagicTemplateLanguage: process.env.WHATSAPP_MAGIC_TEMPLATE_LANGUAGE || 'en_US',
  magicLinkBaseUrl: process.env.MAGIC_LINK_BASE_URL || 'https://mycrowb.pages.dev/login',
  magicLinkExpiryMinutes: Number(process.env.MAGIC_LINK_EXPIRY_MINUTES || 5),
  magicLinkRateLimitSeconds: Number(process.env.MAGIC_LINK_RATE_LIMIT_SECONDS || 60),
  osrmBaseUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:8080',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY)
};
