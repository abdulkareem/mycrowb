const axios = require('axios');
const twilio = require('twilio');
const {
  twilioAccountSid,
  twilioAuthToken,
  twilioVerifyServiceSid,
  smsFallbackSender,
  twilioWhatsappFrom,
  whatsappPhoneNumberId,
  whatsappAccessToken,
  whatsappApiUrl,
  whatsappMagicTemplateName,
  whatsappMagicTemplateLanguage,
  magicLinkBaseUrl
} = require('../config/env');
const { normalizeMobile } = require('../utils/mobile');
const prisma = require('../config/prisma');

const memoryOtp = new Map();
const client = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;

const WHATSAPP_PLATFORM_URL =
  'https://whatsappplatform-production.up.railway.app/api/send-message';

const API_KEY =
  'fdbf0504626128f64e4ecb27de92c2ed1ab29600a20b02f2';

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

  if (WHATSAPP_PLATFORM_URL && API_KEY) {
    await sendOTP(normalizedMobile, code);
    return { provider: 'whatsapp-platform-api' };
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
  const recipient = formatWhatsappRecipient(phoneNumber);
  const otpCode = String(otp || `${Math.floor(100000 + Math.random() * 900000)}`);
  const url = `${whatsappApiUrl}/${whatsappPhoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: 'logincode',
      language: {
        code: 'en_US'
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
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
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

  // eslint-disable-next-line no-console
  console.log('WhatsApp payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  // eslint-disable-next-line no-console
  console.log('WhatsApp response:', data);

  if (!response.ok || data.error) {
    const message = data?.error?.message || `WhatsApp API request failed with status ${response.status}`;
    throw new Error(message);
  }

  const normalizedMobile = normalizeMobile(phoneNumber);
  memoryOtp.set(normalizedMobile, otpCode);

  await prisma.user.updateMany({
    where: { mobile: normalizedMobile },
    data: {
      userPin: otpCode,
      pinAttempts: 0,
      pinCreatedAt: new Date()
    }
  });

  return data;
}

async function sendWhatsAppPlatformOTP(phoneNumber, otp) {
  return sendOTP(phoneNumber, otp);
}

async function sendOTP(phone, otp) {
  const recipient = formatWhatsappRecipient(phone);
  const otpCode = String(otp || `${Math.floor(100000 + Math.random() * 900000)}`);
  const message = `Your Mycrowb OTP is ${otpCode}. Valid for 5 minutes. Do not share this code.`;

  try {
    const response = await axios.post(
      WHATSAPP_PLATFORM_URL,
      {
        keyword: 'MYCROWB',
        to: recipient,
        message
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        }
      }
    );

    const data = response.data;

    const normalizedMobile = normalizeMobile(phone);
    memoryOtp.set(normalizedMobile, otpCode);

    await prisma.user.updateMany({
      where: { mobile: normalizedMobile },
      data: {
        userPin: otpCode,
        pinAttempts: 0,
        pinCreatedAt: new Date()
      }
    });

    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('WhatsApp send failed:', error.response?.data || error.message);
    const err = new Error(error?.response?.data?.error?.message || 'Failed to send OTP via WhatsApp platform');
    err.status = error?.response?.status || 502;
    throw err;
  }
}


async function sendWhatsAppMagicLink(phoneNumber, userName, token) {
  const recipient = formatWhatsappRecipient(phoneNumber);
  const url = `${whatsappApiUrl}/${whatsappPhoneNumberId}/messages`;
  const linkSeparator = magicLinkBaseUrl.includes('?') ? '&' : '?';
  const verificationLink = `${magicLinkBaseUrl}${linkSeparator}t=${encodeURIComponent(String(token))}`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: whatsappMagicTemplateName,
      language: {
        code: whatsappMagicTemplateLanguage
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: String(userName || 'User')
            }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: verificationLink
            }
          ]
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const message = data?.error?.message || `WhatsApp API request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}


async function sendVerificationCodeMessage(phoneNumber, code) {
  const message = `Welcome to MyCrowb. Your verification code is ${code}`;
  const recipient = formatWhatsappRecipient(phoneNumber);

  if (whatsappPhoneNumberId && whatsappAccessToken && whatsappApiUrl) {
    const url = `${whatsappApiUrl}/${whatsappPhoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { body: message }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${whatsappAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      const err = new Error(data?.error?.message || `WhatsApp API request failed with status ${response.status}`);
      err.status = 502;
      throw err;
    }

    return data;
  }

  return sendWhatsappMessage(phoneNumber, message);
}

module.exports = {
  sendOtp,
  verifyOtp,
  sendWhatsappMessage,
  sendWhatsAppPin,
  sendWhatsAppOTP,
  sendWhatsAppPlatformOTP,
  sendWhatsAppMagicLink,
  sendVerificationCodeMessage
};
