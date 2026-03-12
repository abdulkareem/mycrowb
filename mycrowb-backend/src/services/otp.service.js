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
  whatsappTemplateLanguage,
  whatsappTemplateParamMode,
  whatsappTemplateAppName,
  whatsappTemplateBodyParameterName,
  whatsappTemplateButtonUrlIndex,
  whatsappTemplateButtonUrlValue
} = require('../config/env');
const { normalizeMobile } = require('../utils/mobile');
const prisma = require('../config/prisma');

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
  const otpCode = otp || `${Math.floor(100000 + Math.random() * 900000)}`;
  const normalizedMobile = normalizeMobile(phoneNumber);
  const primaryPayloadConfig = buildTemplatePayload({ recipient, otpCode });

  // eslint-disable-next-line no-console
  console.log('WhatsApp template request config', {
    templateName: whatsappTemplateName,
    templateLanguage: whatsappTemplateLanguage,
    parameterCount: primaryPayloadConfig.parameterCount,
    parameterMode: whatsappTemplateParamMode
  });

  const postTemplatePayload = (payload) => axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${whatsappAccessToken}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    const response = await postTemplatePayload(primaryPayloadConfig.payload);

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
    let effectiveError = error;
    let details = effectiveError.response?.data || { message: effectiveError.message };
    let errorCode = details?.error?.code || effectiveError.code || null;
    let fbtraceId = details?.error?.fbtrace_id || null;

    if (Number(errorCode) === 131008) {
      const fallbackPayloadConfig = buildTemplatePayload({
        recipient,
        otpCode,
        forceAuthenticationButton: true
      });

      try {
        // eslint-disable-next-line no-console
        console.warn('Retrying WhatsApp template with authentication button payload fallback', {
          templateName: whatsappTemplateName,
          parameterCount: fallbackPayloadConfig.parameterCount
        });

        const fallbackResponse = await postTemplatePayload(fallbackPayloadConfig.payload);

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
        console.log('WhatsApp API response (fallback payload):', fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        // continue with existing error handling using fallback failure details
        effectiveError = fallbackError;
        details = effectiveError.response?.data || { message: effectiveError.message };
        errorCode = details?.error?.code || effectiveError.code || null;
        fbtraceId = details?.error?.fbtrace_id || null;
      }
    }

    // eslint-disable-next-line no-console
    console.error('WhatsApp PIN delivery failed', {
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

function buildTemplatePayload({ recipient, otpCode, forceAuthenticationButton = false }) {
  const templateParameters = forceAuthenticationButton ? [] : buildTemplateParameters(otpCode);

  const components = [];
  if (templateParameters.length) {
    components.push({
      type: 'body',
      parameters: templateParameters
    });
  }

  const buttonComponent = buildTemplateButtonComponent(otpCode, forceAuthenticationButton);
  if (buttonComponent) {
    components.push(buttonComponent);
  }

  return {
    parameterCount: templateParameters.length,
    payload: {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: whatsappTemplateName,
        language: { code: whatsappTemplateLanguage },
        components
      }
    }
  };
}

function buildTemplateButtonComponent(otpCode, forceAuthenticationButton = false) {
  if (forceAuthenticationButton) {
    return {
      type: 'button',
      sub_type: 'copy_code',
      index: '0',
      parameters: [
        {
          type: 'payload',
          payload: otpCode
        }
      ]
    };
  }

  if (whatsappTemplateButtonUrlIndex === '' || whatsappTemplateButtonUrlValue === '') {
    return null;
  }

  return {
    type: 'button',
    sub_type: 'url',
    index: String(whatsappTemplateButtonUrlIndex),
    parameters: [
      {
        type: 'text',
        text: whatsappTemplateButtonUrlValue
      }
    ]
  };
}

function buildTemplateParameters(otpCode) {
  const otpParameter = { type: 'text', text: otpCode };

  switch (whatsappTemplateParamMode) {
    case 'otp_only':
      return [otpParameter];
    case 'named_otp_only':
      return [
        { type: 'text', parameter_name: whatsappTemplateBodyParameterName || 'code', text: otpCode }
      ];
    case 'app_name_and_otp':
    default:
      return [
        { type: 'text', text: whatsappTemplateAppName },
        otpParameter
      ];
  }
}

module.exports = { sendOtp, verifyOtp, sendWhatsappMessage, sendWhatsAppPin, sendWhatsAppOTP };
