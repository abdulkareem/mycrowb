const prisma = require('../config/prisma');
const { sendOtp, verifyOtp } = require('../services/otp.service');
const { signToken } = require('../utils/jwt');

async function requestOtp(req, res, next) {
  try {
    const { mobile } = req.body;
    await sendOtp(mobile);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
}

async function verifyOtpLogin(req, res, next) {
  try {
    const { mobile, code, name } = req.body;
    const valid = await verifyOtp(mobile, code);
    if (!valid) return res.status(400).json({ message: 'Invalid OTP' });

    const user = await prisma.user.upsert({
      where: { mobile },
      update: { name: name || 'MYCROWB User' },
      create: { mobile, name: name || 'MYCROWB User', role: 'BARBER' }
    });

    const token = signToken({ sub: user.id, role: user.role, mobile: user.mobile });
    return res.json({ token, user });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestOtp, verifyOtpLogin };
