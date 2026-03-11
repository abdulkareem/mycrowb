const twilio = require('twilio');
const axios = require('axios');
const {
  twilioAccountSid,
  twilioAuthToken,
  twilioVerifyServiceSid,
  smsFallbackSender,
  twilioWhatsappFrom,
  whatsappPhoneNumberId,
  whatsappAccessToken,
  whatsappApiUrl
} = require('../config/env');
const { normalizeMobile } = require('../utils/mobile');

const memoryOtp = new Map();
const client = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;

async function sendOtp(mobile) {
  const normalizedMobile = normalizeMobile(mobile);

  if (client && twilioVerifyServiceSid) {
    await client.verify.v2.services(twilioVerifyServiceSid).verifications.create({ to: `+91${normalizedMobile}`, channel: 'sms' });
    return { provider: 'twilio-verify' };
  }

  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  memoryOtp.set(normalizedMobile, code);
  // eslint-disable-next-line no-console
  console.log(`Fallback OTP via ${smsFallbackSender} for ${normalizedMobile}: ${code}`);
  return { provider: 'fallback', codeInLogs: true };
}

async function verifyOtp(mobile, code) {
  const normalizedMobile = normalizeMobile(mobile);

  if (client && twilioVerifyServiceSid) {
    const result = await client.verify.v2.services(twilioVerifyServiceSid)
      .verificationChecks.create({ to: `+91${normalizedMobile}`, code });
    return result.status === 'approved';
  }
  return memoryOtp.get(normalizedMobile) === code;
}

async function sendWhatsappMessage(mobile, body) {
  const normalizedMobile = normalizeMobile(mobile);

  if (client && twilioWhatsappFrom) {
    await client.messages.create({
      from: twilioWhatsappFrom,
      to: `whatsapp:+91${normalizedMobile}`,
      body
    });
    return { provider: 'twilio-whatsapp' };
  }

  // eslint-disable-next-line no-console
  console.log(`Fallback WhatsApp via ${smsFallbackSender} for ${normalizedMobile}:\n${body}`);
  return { provider: 'fallback', bodyInLogs: true };
}

function formatWhatsappRecipient(mobile) {
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) return '';

  return `91${normalizedMobile}`;
}

async function sendWhatsAppPin(phoneNumber, pin) {
  if (!whatsappPhoneNumberId || !whatsappAccessToken || !whatsappApiUrl) {
    throw new Error('Missing WhatsApp Cloud API configuration');
  }

  const recipient = formatWhatsappRecipient(phoneNumber);
  const url = `${whatsappApiUrl.replace(/\/$/, '')}/${whatsappPhoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: 'registration_otp',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: `${pin}` }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            { type: 'text', text: `${pin}` }
          ]
        }
      ]
    }
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

module.exports = { sendOtp, verifyOtp, sendWhatsappMessage, sendWhatsAppPin };
