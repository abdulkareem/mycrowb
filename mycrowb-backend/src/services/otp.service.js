const twilio = require('twilio');
const {
  twilioAccountSid,
  twilioAuthToken,
  twilioVerifyServiceSid,
  smsFallbackSender
} = require('../config/env');

const memoryOtp = new Map();
const client = twilioAccountSid && twilioAuthToken ? twilio(twilioAccountSid, twilioAuthToken) : null;

async function sendOtp(mobile) {
  if (client && twilioVerifyServiceSid) {
    await client.verify.v2.services(twilioVerifyServiceSid).verifications.create({ to: mobile, channel: 'sms' });
    return { provider: 'twilio-verify' };
  }

  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  memoryOtp.set(mobile, code);
  // eslint-disable-next-line no-console
  console.log(`Fallback OTP via ${smsFallbackSender} for ${mobile}: ${code}`);
  return { provider: 'fallback', codeInLogs: true };
}

async function verifyOtp(mobile, code) {
  if (client && twilioVerifyServiceSid) {
    const result = await client.verify.v2.services(twilioVerifyServiceSid)
      .verificationChecks.create({ to: mobile, code });
    return result.status === 'approved';
  }
  return memoryOtp.get(mobile) === code;
}

module.exports = { sendOtp, verifyOtp };
