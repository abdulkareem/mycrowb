const prisma = require('../config/prisma');
const { sendOtp, verifyOtp, sendWhatsAppPin } = require('../services/otp.service');
const { signToken } = require('../utils/jwt');
const { mobileLookupVariants, normalizeMobile } = require('../utils/mobile');
const { ensureLoginActivityLocationColumns } = require('../utils/db-capabilities');

const notRegisteredMessage = 'User is not registered. Contact the company at mycrowbee@gmail.com.';
const fallbackSuperAdminNumbers = new Set(['9747917623']);
const MAX_PIN_ATTEMPTS = 4;

function generatePin() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function findAuthorizedAdminNumber(normalizedMobile) {
  if (!normalizedMobile) return null;

  const activeAdmins = await prisma.authorizedAdminNumber.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  const matchedAdmin = activeAdmins.find((admin) => normalizeMobile(admin.mobile) === normalizedMobile);
  if (matchedAdmin) return matchedAdmin;

  if (fallbackSuperAdminNumbers.has(normalizedMobile)) {
    return {
      mobile: normalizedMobile,
      isSuperAdmin: true,
      isActive: true
    };
  }

  return null;
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

async function getPortalUserByRole(role, normalizedMobile) {
  if (role === 'barber') {
    const registeredShop = await prisma.barberShop.findFirst({
      where: {
        whatsappNumber: {
          in: mobileLookupVariants(normalizedMobile)
        },
        status: 'ACTIVE'
      },
      include: { owner: true }
    });

    if (!registeredShop?.owner) {
      return null;
    }

    const owner = registeredShop.owner;
    if (owner.mobile !== normalizedMobile) {
      return prisma.user.update({
        where: { id: owner.id },
        data: { mobile: normalizedMobile }
      });
    }

    return owner;
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
      return null;
    }

    let user = await prisma.user.findFirst({
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

    const updates = {};
    if (user.role !== 'SERVICE_STAFF') updates.role = 'SERVICE_STAFF';
    if (user.name !== registeredStaff.name) updates.name = registeredStaff.name;
    if (user.mobile !== normalizedMobile) updates.mobile = normalizedMobile;

    if (Object.keys(updates).length) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updates
      });
    }

    return user;
  }

  return null;
}

async function requestOtp(req, res, next) {
  try {
    const { mobile, whatsappNumber, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);

    if (role === 'barber' || role === 'staff') {
      const user = await getPortalUserByRole(role, normalizedMobile);
      if (!user) {
        return res.status(404).json({ message: notRegisteredMessage });
      }

      const newPin = generatePin();
      await sendWhatsAppPin(normalizedMobile, newPin);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          userPin: newPin,
          pinAttempts: 0,
          pinCreatedAt: new Date()
        }
      });

      return res.json({ message: 'PIN sent successfully', pinRequested: true });
    }

    if (role === 'admin') {
      const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
      const existingAdminUser = await findExistingAdminUser(normalizedMobile);

      if (!authorizedAdmin && !existingAdminUser) {
        return res.status(404).json({ message: notRegisteredMessage });
      }
    }

    await sendOtp(normalizedMobile);
    return res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    if (error.status === 502) {
      return res.status(502).json({
        message: error.message || 'We could not deliver your OTP/PIN on WhatsApp. Please retry in a moment.',
        retryable: error.retryable !== undefined ? error.retryable : true,
        details: error.details || null
      });
    }

    return next(error);
  }
}

async function verifyOtpLogin(req, res, next) {
  try {
    const { mobile, whatsappNumber, code, name, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);

    if (role !== 'admin') {
      return res.status(400).json({ message: 'OTP verification is allowed for admin only.' });
    }

    const valid = await verifyOtp(normalizedMobile, code);
    if (!valid) return res.status(400).json({ message: 'Invalid OTP' });

    const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
    const existingAdminUser = await findExistingAdminUser(normalizedMobile);

    if (!authorizedAdmin && !existingAdminUser) {
      return res.status(403).json({ message: 'This WhatsApp number is not authorized for admin login.' });
    }

    let user = existingAdminUser;

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

    const token = signToken({ sub: user.id, role: nextRole, mobile: user.mobile });

    await ensureLoginActivityLocationColumns();

    const activity = await prisma.loginActivity.create({
      data: {
        userId: user.id,
        mobile: user.mobile,
        role: nextRole,
        latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : null,
        longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : null,
        locationLabel: req.body.locationLabel || null
      }
    });

    return res.json({ token, user: { ...user, role: nextRole }, sessionId: activity.id });
  } catch (error) {
    return next(error);
  }
}

async function loginWithPin(req, res, next) {
  try {
    const { mobile, whatsappNumber, pin, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);

    if (!['barber', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'PIN login is available only for Hair Stylist and Staff.' });
    }

    if (!/^\d{6}$/.test(`${pin || ''}`)) {
      return res.status(400).json({ message: 'Please enter a valid 6 digit PIN.' });
    }

    let user = await getPortalUserByRole(role, normalizedMobile);
    if (!user) {
      return res.status(404).json({ message: notRegisteredMessage });
    }

    if (!user.userPin) {
      return res.status(400).json({
        message: 'PIN not requested yet. Please request PIN on WhatsApp first.',
        requiresPinRequest: true
      });
    }

    if ((user.pinAttempts || 0) >= MAX_PIN_ATTEMPTS) {
      return res.status(403).json({
        message: 'PIN attempts exceeded. Request a new PIN on WhatsApp.',
        requiresPinReset: true,
        attempts: user.pinAttempts
      });
    }

    if (user.userPin !== pin) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { pinAttempts: { increment: 1 } },
        select: { pinAttempts: true }
      });

      if (updatedUser.pinAttempts >= MAX_PIN_ATTEMPTS) {
        return res.status(403).json({
          message: 'PIN attempts exceeded. Request a new PIN on WhatsApp.',
          requiresPinReset: true,
          attempts: updatedUser.pinAttempts
        });
      }

      return res.status(400).json({
        message: 'Incorrect PIN. Try again.',
        attempts: updatedUser.pinAttempts,
        remainingAttempts: MAX_PIN_ATTEMPTS - updatedUser.pinAttempts
      });
    }

    user = await prisma.user.update({
      where: { id: user.id },
      data: { pinAttempts: 0 }
    });

    const tokenRole = role === 'barber' ? 'BARBER' : 'SERVICE_STAFF';
    const token = signToken({ sub: user.id, role: tokenRole, mobile: user.mobile });

    await ensureLoginActivityLocationColumns();

    const activity = await prisma.loginActivity.create({
      data: {
        userId: user.id,
        mobile: user.mobile,
        role: tokenRole,
        latitude: req.body.latitude !== undefined ? Number(req.body.latitude) : null,
        longitude: req.body.longitude !== undefined ? Number(req.body.longitude) : null,
        locationLabel: req.body.locationLabel || null
      }
    });

    return res.json({ token, user: { ...user, role: tokenRole }, sessionId: activity.id });
  } catch (error) {
    return next(error);
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

module.exports = { requestOtp, verifyOtpLogin, loginWithPin, me, logout, checkAdminEligibility };
