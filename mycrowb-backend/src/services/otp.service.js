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
  whatsappApiUrl,
  whatsappTemplateName,
  whatsappTemplateLanguage
} = require('../config/env');
const { normalizeMobile } = require('../utils/mobile');

const memoryOtp = new Map();
const client = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;

async function sendOtp(mobile) {
  const normalizedMobile = normalizeMobile(mobile);
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;

  if (client && twilioVerifyServiceSid) {
    await client.verify.v2.services(twilioVerifyServiceSid).verifications.create({
      to: `+91${normalizedMobile}`,
      channel: 'whatsapp'
    });
    return { provider: 'twilio-verify-whatsapp' };
  }

  if (whatsappPhoneNumberId && whatsappAccessToken && whatsappApiUrl) {
    await sendWhatsAppPin(normalizedMobile, code);
    memoryOtp.set(normalizedMobile, code);
    return { provider: 'whatsapp-cloud-api' };
  }

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
  if (!normalizedMobile || normalizedMobile.length !== 10) {
    const error = new Error('Invalid WhatsApp number. Please provide a valid 10-digit Indian mobile number.');
    error.status = 400;
    throw error;
  }

  return `91${normalizedMobile}`;
}


function buildWhatsappTemplatePayload({ recipient, pin, bodyParamCount = 1, urlButtonParamCount = 1 }) {
  const components = [];

  if (bodyParamCount > 0) {
    components.push({
      type: 'body',
      parameters: Array.from({ length: bodyParamCount }, () => ({ type: 'text', text: `${pin}` }))
    });
  }

  if (urlButtonParamCount > 0) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: Array.from({ length: urlButtonParamCount }, () => ({ type: 'text', text: `${pin}` }))
    });
  }

  return {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: whatsappTemplateName,
      language: { code: whatsappTemplateLanguage },
      ...(components.length > 0 ? { components } : {})
    }
  };
}

function parseExpectedParameterCount(errorData, componentName) {
  const detailText = [
    errorData?.error_data?.details,
    errorData?.error?.error_data?.details,
    errorData?.error?.message,
    errorData?.message
  ].filter(Boolean).join(' | ');

  const componentRegex = new RegExp(`${componentName}[^0-9]*(?:expected|has)\\s*(\\d+)`, 'i');
  const componentMatch = detailText.match(componentRegex);
  if (componentMatch) return Number(componentMatch[1]);

  const fallbackRegex = new RegExp(`${componentName}[^0-9]*\\((\\d+)\\)`, 'i');
  const fallbackMatch = detailText.match(fallbackRegex);
  if (fallbackMatch) return Number(fallbackMatch[1]);

  return null;
}

async function sendWhatsAppPin(phoneNumber, pin) {
  if (!whatsappPhoneNumberId || !whatsappAccessToken || !whatsappApiUrl) {
    throw new Error('Missing WhatsApp Cloud API configuration');
  }

  const recipient = formatWhatsappRecipient(phoneNumber);
  const url = `${whatsappApiUrl.replace(/\/$/, '')}/${whatsappPhoneNumberId}/messages`;

  const postTemplatePayload = (payload) => axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const attempts = [
    { label: 'default', payload: buildWhatsappTemplatePayload({ recipient, pin, bodyParamCount: 1, urlButtonParamCount: 1 }) }
  ];

  const seenPayloads = new Set([JSON.stringify(attempts[0].payload)]);
  let lastErrorDetails = null;

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];

    try {
      const response = await postTemplatePayload(attempt.payload);
      if (index > 0) {
        // eslint-disable-next-line no-console
        console.warn('WhatsApp PIN delivery succeeded after payload fallback', { recipient, fallback: attempt.label });
      }
      return response.data;
    } catch (error) {
      const details = error.response?.data || { message: error.message };
      lastErrorDetails = details;
      const code = error.response?.data?.error?.code;

      if (code === 132000) {
        const expectedBody = parseExpectedParameterCount(details, 'body');
        const expectedUrlButton = parseExpectedParameterCount(details, 'button');

        if (expectedBody !== null || expectedUrlButton !== null) {
          const adaptivePayload = buildWhatsappTemplatePayload({
            recipient,
            pin,
            bodyParamCount: expectedBody ?? 1,
            urlButtonParamCount: expectedUrlButton ?? 1
          });
          const signature = JSON.stringify(adaptivePayload);

          if (!seenPayloads.has(signature)) {
            attempts.push({
              label: `adaptive(body:${expectedBody ?? 1},button:${expectedUrlButton ?? 1})`,
              payload: adaptivePayload
            });
            seenPayloads.add(signature);
            // eslint-disable-next-line no-console
            console.warn('WhatsApp PIN delivery parameter mismatch, retrying with adaptive payload', {
              recipient,
              expectedBodyParamCount: expectedBody,
              expectedButtonParamCount: expectedUrlButton
            });
            continue;
          }
        }

        const fallbackPayloads = [
          { label: 'body+url-button', payload: buildWhatsappTemplatePayload({ recipient, pin, bodyParamCount: 1, urlButtonParamCount: 1 }) },
          { label: 'body-only', payload: buildWhatsappTemplatePayload({ recipient, pin, bodyParamCount: 1, urlButtonParamCount: 0 }) },
          { label: 'url-button-only', payload: buildWhatsappTemplatePayload({ recipient, pin, bodyParamCount: 0, urlButtonParamCount: 1 }) },
          { label: 'no-components', payload: buildWhatsappTemplatePayload({ recipient, pin, bodyParamCount: 0, urlButtonParamCount: 0 }) }
        ];

        fallbackPayloads.forEach((fallback) => {
          const signature = JSON.stringify(fallback.payload);
          if (!seenPayloads.has(signature)) {
            attempts.push(fallback);
            seenPayloads.add(signature);
          }
        });

        if (index < attempts.length - 1) {
          // eslint-disable-next-line no-console
          console.warn('WhatsApp PIN delivery payload mismatch, retrying with next payload shape', {
            recipient,
            failedPayload: attempt.label,
            nextPayload: attempts[index + 1].label
          });
          continue;
        }
      }

      // eslint-disable-next-line no-console
      console.error('WhatsApp PIN delivery failed', { recipient, payload: attempt.label, details });
      break;
    }
  }

  const deliveryError = new Error('Failed to send OTP on WhatsApp. Please verify the number has joined WhatsApp and template is approved.');
  deliveryError.status = 502;
  deliveryError.details = lastErrorDetails;
  throw deliveryError;
}

module.exports = { sendOtp, verifyOtp, sendWhatsappMessage, sendWhatsAppPin };
