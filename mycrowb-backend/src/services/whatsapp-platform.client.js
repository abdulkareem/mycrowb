const axios = require('axios');
const {
  whatsappPlatformBaseUrl,
  whatsappPlatformSendPath,
  whatsappPlatformTimeoutMs,
  whatsappPlatformApiKey
} = require('../config/env');
const { normalizeMobile } = require('../utils/mobile');

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryable(error) {
  const status = error?.response?.status;
  return !status || status === 429 || status >= 500;
}

function sanitizeForLog(value) {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `***${digits.slice(-4)}`;
}

function buildClient() {
  const baseURL = String(whatsappPlatformBaseUrl || '').replace(/\/$/, '');

  if (!baseURL || !whatsappPlatformApiKey) {
    const error = new Error('WhatsApp platform client is not configured.');
    error.status = 500;
    throw error;
  }

  return axios.create({
    baseURL,
    timeout: whatsappPlatformTimeoutMs
  });
}

function validateOutboundMessage({ mobile, message }) {
  const normalizedMobile = normalizeMobile(mobile);
  const normalizedMessage = String(message || '').replace(/\s+/g, ' ').trim();

  if (!/^\d{10}$/.test(normalizedMobile)) {
    const error = new Error('Valid 10-digit mobile is required.');
    error.status = 400;
    throw error;
  }

  if (!normalizedMessage) {
    const error = new Error('Message is required.');
    error.status = 400;
    throw error;
  }

  if (normalizedMessage.length > 1000) {
    const error = new Error('Message exceeds 1000 character limit.');
    error.status = 400;
    throw error;
  }

  return {
    mobile: `91${normalizedMobile}`,
    message: normalizedMessage
  };
}

async function sendMessageToPlatform({ mobile, message, correlationId }) {
  const client = buildClient();
  const payload = validateOutboundMessage({ mobile, message });
  const path = whatsappPlatformSendPath || '/api/messages/send';

  let attempt = 0;
  let lastError;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await client.post(path, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': whatsappPlatformApiKey,
          'x-correlation-id': correlationId || ''
        }
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify({
        event: 'whatsapp_platform_send_success',
        correlationId,
        status: response.status,
        mobile: sanitizeForLog(payload.mobile),
        attempt
      }));

      return response.data;
    } catch (error) {
      lastError = error;
      const retryable = isRetryable(error);
      const status = error?.response?.status || 0;

      // eslint-disable-next-line no-console
      console.error(JSON.stringify({
        event: 'whatsapp_platform_send_failed',
        correlationId,
        status,
        retryable,
        attempt,
        mobile: sanitizeForLog(payload.mobile),
        reason: error?.response?.data?.message || error.message
      }));

      if (!retryable || attempt >= MAX_RETRIES) {
        break;
      }

      const backoff = BASE_BACKOFF_MS * (2 ** attempt);
      await sleep(backoff);
      attempt += 1;
    }
  }

  const err = new Error(lastError?.response?.data?.message || 'Failed to send WhatsApp message to platform.');
  err.status = lastError?.response?.status || 502;
  throw err;
}

module.exports = {
  sendMessageToPlatform,
  validateOutboundMessage,
  isRetryable
};
