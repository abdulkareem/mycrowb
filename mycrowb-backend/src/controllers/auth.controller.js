const prisma = require('../config/prisma');
const { sendOtp, verifyOtp } = require('../services/otp.service');
const { signToken } = require('../utils/jwt');
const { mobileLookupVariants, normalizeMobile } = require('../utils/mobile');

async function requestOtp(req, res, next) {
  try {
    const { mobile, whatsappNumber, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);
    const notRegisteredMessage = 'User is not registered. Contact the company at mycrowbee@gmail.com.';

    if (role === 'barber') {
      const registeredShop = await prisma.barberShop.findFirst({
        where: {
          whatsappNumber: {
            in: mobileLookupVariants(normalizedMobile)
          },
          status: 'ACTIVE'
        }
      });

      if (!registeredShop) {
        return res.status(404).json({ message: notRegisteredMessage });
      }
    }

    if (role === 'staff') {
      const registeredStaff = await prisma.staffProfile.findFirst({
        where: {
          whatsappNumber: {
            in: mobileLookupVariants(normalizedMobile)
          },
          isActive: true
        }
      });

      if (!registeredStaff) {
        return res.status(404).json({ message: notRegisteredMessage });
      }
    }

    if (role === 'admin') {
      const adminUser = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          mobile: {
            in: mobileLookupVariants(normalizedMobile)
          }
        }
      });

      if (!adminUser) {
        return res.status(404).json({ message: notRegisteredMessage });
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
    const { mobile, whatsappNumber, code, name, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);
    const valid = await verifyOtp(normalizedMobile, code);
    if (!valid) return res.status(400).json({ message: 'Invalid OTP' });

    const notRegisteredMessage = 'User is not registered. Contact the company at mycrowbee@gmail.com.';

    let user;
    if (role === 'barber') {
      const shop = await prisma.barberShop.findFirst({
        where: {
          whatsappNumber: {
            in: mobileLookupVariants(normalizedMobile)
          }
        },
        include: { owner: true }
      });

      if (!shop?.owner) {
        return res.status(404).json({ message: notRegisteredMessage });
      }

      user = shop.owner;
    }

    if (role === 'admin') {
      user = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          mobile: {
            in: mobileLookupVariants(normalizedMobile)
          }
        }
      });
    }

    if (role === 'staff') {
      const registeredStaff = await prisma.staffProfile.findFirst({
        where: {
          whatsappNumber: {
            in: mobileLookupVariants(normalizedMobile)
          },
          isActive: true
        }
      });

      if (!registeredStaff) {
        return res.status(404).json({ message: notRegisteredMessage });
      }

      user = await prisma.user.findFirst({
        where: {
          mobile: {
            in: mobileLookupVariants(normalizedMobile)
          }
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            mobile: normalizedMobile,
            name: registeredStaff.name,
            role: 'SERVICE_STAFF'
          }
        });
      }
    }

    if (!user) {
      return res.status(404).json({ message: notRegisteredMessage });
    }

    if (role === 'staff' && user.role !== 'SERVICE_STAFF') {
      return res.status(403).json({ message: 'This WhatsApp number is not authorized for staff login.' });
    }

    if (role === 'admin' && user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'This WhatsApp number is not authorized for admin login.' });
    }

    if (name && user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    const tokenRole = role === 'barber' ? 'BARBER' : role === 'staff' ? 'SERVICE_STAFF' : 'ADMIN';
    const token = signToken({ sub: user.id, role: tokenRole, mobile: user.mobile });
    return res.json({ token, user: { ...user, role: tokenRole } });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestOtp, verifyOtpLogin };
