const prisma = require('../config/prisma');
const { sendOtp, verifyOtp } = require('../services/otp.service');
const { signToken } = require('../utils/jwt');
const { mobileLookupVariants, normalizeMobile } = require('../utils/mobile');

async function requestOtp(req, res, next) {
  try {
    const { mobile, role } = req.body;
    const normalizedMobile = normalizeMobile(mobile);

    if (role === 'staff') {
      const registeredStaff = await prisma.staffProfile.findFirst({
        where: {
          mobileNumber: {
            in: mobileLookupVariants(normalizedMobile)
          },
          isActive: true
        }
      });

      if (!registeredStaff) {
        return res.status(404).json({ message: 'staff not registred' });
      }
    }

    await sendOtp(normalizedMobile);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
}

async function verifyOtpLogin(req, res, next) {
  try {
    const { mobile, code, name, role } = req.body;
    const normalizedMobile = normalizeMobile(mobile);
    const valid = await verifyOtp(normalizedMobile, code);
    if (!valid) return res.status(400).json({ message: 'Invalid OTP' });

    const notRegisteredMessage = 'You are not registered with Mycrowb Your Eco Friend LLP. If you want to register, contact 9747917623 or mycrowbee@gmail.com.';
    const staffNotRegisteredMessage = 'staff not registred';

    let user;
    try {
      user = await prisma.user.findFirst({
        where: {
          mobile: {
            in: mobileLookupVariants(normalizedMobile)
          }
        }
      });
    } catch (error) {
      if (error.code === 'P2021') {
        return res.status(404).json({ message: notRegisteredMessage });
      }

      throw error;
    }

    if (!user && role === 'admin') {
      user = await prisma.user.create({
        data: {
          mobile: normalizedMobile,
          name: name || 'Admin',
          role: 'ADMIN'
        }
      });

      await prisma.admin.create({
        data: {
          userId: user.id,
          department: 'Operations'
        }
      });
    }

    if (!user && role === 'staff') {
      const registeredStaff = await prisma.staffProfile.findFirst({
        where: {
          mobileNumber: {
            in: mobileLookupVariants(normalizedMobile)
          },
          isActive: true
        }
      });

      if (!registeredStaff) {
        return res.status(404).json({ message: staffNotRegisteredMessage });
      }

      user = await prisma.user.create({
        data: {
          mobile: normalizedMobile,
          name: registeredStaff.name,
          role: 'SERVICE_STAFF'
        }
      });
    }

    if (!user) {
      return res.status(404).json({ message: notRegisteredMessage });
    }

    if (role === 'staff' && user.role !== 'SERVICE_STAFF') {
      return res.status(403).json({ message: 'This mobile is not authorized for staff login.' });
    }

    if (name && user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    const token = signToken({ sub: user.id, role: user.role, mobile: user.mobile });
    return res.json({ token, user });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestOtp, verifyOtpLogin };
