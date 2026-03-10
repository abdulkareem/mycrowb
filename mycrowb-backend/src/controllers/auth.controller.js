const prisma = require('../config/prisma');
const { sendOtp, verifyOtp } = require('../services/otp.service');
const { signToken } = require('../utils/jwt');
const { mobileLookupVariants, normalizeMobile } = require('../utils/mobile');

const notRegisteredMessage = 'User is not registered. Contact the company at mycrowbee@gmail.com.';

async function findAuthorizedAdminNumber(normalizedMobile) {
  if (!normalizedMobile) return null;

  const activeAdmins = await prisma.authorizedAdminNumber.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  return activeAdmins.find((admin) => normalizeMobile(admin.mobile) === normalizedMobile) || null;
}

async function findExistingAdminUser(normalizedMobile) {
  if (!normalizedMobile) return null;

  return prisma.user.findFirst({
    where: {
      mobile: {
        in: mobileLookupVariants(normalizedMobile)
      },
      role: {
        in: ['ADMIN', 'SUPER_ADMIN']
      }
    }
  });
}

async function requestOtp(req, res, next) {
  try {
    const { mobile, whatsappNumber, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);

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
      const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
      const existingAdminUser = await findExistingAdminUser(normalizedMobile);

      if (!authorizedAdmin && !existingAdminUser) {
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

    let user;
    let tokenRole;

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
      tokenRole = 'BARBER';
    }

    if (role === 'admin') {
      const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
      const existingAdminUser = await findExistingAdminUser(normalizedMobile);

      if (!authorizedAdmin && !existingAdminUser) {
        return res.status(403).json({ message: 'This WhatsApp number is not authorized for admin login.' });
      }

      user = existingAdminUser;

      const nextRole = authorizedAdmin
        ? (authorizedAdmin.isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN')
        : existingAdminUser.role;

      if (!user) {
        user = await prisma.user.create({
          data: {
            mobile: normalizedMobile,
            name: name || 'Admin User',
            role: nextRole
          }
        });
      } else if (user.role !== nextRole || (name && user.name !== name)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            role: nextRole,
            ...(name ? { name } : {})
          }
        });
      }

      tokenRole = nextRole;
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

      if (user.role !== 'SERVICE_STAFF') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: 'SERVICE_STAFF' }
        });
      }

      tokenRole = 'SERVICE_STAFF';
    }

    if (!user) {
      return res.status(404).json({ message: notRegisteredMessage });
    }

    if (name && user.name !== name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    const token = signToken({ sub: user.id, role: tokenRole, mobile: user.mobile });

    const activity = await prisma.loginActivity.create({
      data: {
        userId: user.id,
        mobile: user.mobile,
        role: tokenRole
      }
    });

    return res.json({ token, user: { ...user, role: tokenRole }, sessionId: activity.id });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required.' });

    await prisma.loginActivity.updateMany({
      where: {
        id: sessionId,
        userId: req.user.sub,
        logoutAt: null
      },
      data: { logoutAt: new Date() }
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}


async function checkAdminEligibility(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.query.mobile || req.query.whatsappNumber);
    if (!normalizedMobile) {
      return res.status(400).json({ message: 'Valid mobile number is required.' });
    }

    const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
    const existingAdminUser = await findExistingAdminUser(normalizedMobile);
    res.json({
      authorized: Boolean(authorizedAdmin || existingAdminUser),
      isSuperAdmin: Boolean(authorizedAdmin?.isSuperAdmin)
        || existingAdminUser?.role === 'SUPER_ADMIN'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { requestOtp, verifyOtpLogin, me, logout, checkAdminEligibility };
