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
const prisma = require('../config/prisma');

const memoryOtp = new Map();
const client = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;
const OTP_TEMPLATE_NAME = 'logincode';
const OTP_TEMPLATE_LANGUAGE = 'en_US';

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
    await sendWhatsAppOTP(normalizedMobile, code);
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
  const user = await prisma.user.findUnique({
    where: { mobile: normalizedMobile },
    select: { userPin: true }
  });

  if (user?.userPin) return user.userPin === code;

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

async function sendWhatsAppPin(phoneNumber, pin) {
  return sendWhatsAppOTP(phoneNumber, pin);
}

async function sendWhatsAppOTP(phoneNumber, otp) {
  if (!whatsappPhoneNumberId || !whatsappAccessToken || !whatsappApiUrl) {
    throw new Error('Missing WhatsApp Cloud API configuration');
  }

  const recipient = formatWhatsappRecipient(phoneNumber);
  const url = `${whatsappApiUrl.replace(/\/$/, '')}/${whatsappPhoneNumberId}/messages`;
  const otpCode = String(otp || `${Math.floor(100000 + Math.random() * 900000)}`);
  const normalizedMobile = normalizeMobile(phoneNumber);
  const payload = buildTemplatePayload({ recipient, otpCode });

  // eslint-disable-next-line no-console
  console.log('WhatsApp OTP request config', {
    endpoint: url,
    recipient,
    templateName: OTP_TEMPLATE_NAME,
    templateLanguage: OTP_TEMPLATE_LANGUAGE,
    otpLength: otpCode.length
  });

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${whatsappAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    memoryOtp.set(normalizedMobile, otpCode);

    await prisma.user.updateMany({
      where: { mobile: normalizedMobile },
      data: {
        userPin: otpCode,
        pinAttempts: 0,
        pinCreatedAt: new Date()
      }
    });

    // eslint-disable-next-line no-console
    console.log('WhatsApp API response:', response.data);
    return response.data;
  } catch (error) {
    const details = error.response?.data || { message: error.message };
    const errorCode = details?.error?.code || error.code || null;
    const fbtraceId = details?.error?.fbtrace_id || null;

    // eslint-disable-next-line no-console
    console.error('WhatsApp OTP delivery failed', {
      recipient,
      errorCode,
      fbtraceId,
      details
    });

    const whatsappErrorMessage = details?.error?.message || '';
    const tokenExpired = Number(errorCode) === 190 && Number(details?.error?.error_subcode) === 463;
    const appDeleted = Number(errorCode) === 190 && /application has been deleted/i.test(whatsappErrorMessage);

    let userFacingMessage = 'Failed to send OTP on WhatsApp. Please retry in a moment and verify the number has joined WhatsApp and template is approved.';
    let retryable = true;

    if (tokenExpired) {
      userFacingMessage = 'WhatsApp OTP service is temporarily unavailable due to an expired integration token. Please contact support to refresh the WhatsApp configuration.';
      retryable = false;
    } else if (appDeleted) {
      userFacingMessage = 'WhatsApp OTP service is unavailable because the connected Meta app was deleted. Please contact support to reconnect WhatsApp credentials.';
      retryable = false;
    }

    const deliveryError = new Error(userFacingMessage);
    deliveryError.status = 502;
    deliveryError.details = details;
    deliveryError.code = errorCode;
    deliveryError.fbtraceId = fbtraceId;
    deliveryError.retryable = retryable;
    throw deliveryError;
  }
}

function buildTemplatePayload({ recipient, otpCode }) {
  return {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: OTP_TEMPLATE_NAME,
      language: {
        code: OTP_TEMPLATE_LANGUAGE
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: String(otpCode)
            }
          ]
        }
      ]
    }
  };
}

module.exports = { sendOtp, verifyOtp, sendWhatsappMessage, sendWhatsAppPin, sendWhatsAppOTP };
