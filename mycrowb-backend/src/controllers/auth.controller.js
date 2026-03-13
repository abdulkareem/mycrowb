const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sendOtp, verifyOtp, sendWhatsAppPin, sendWhatsAppMagicLink, sendVerificationCodeMessage } = require('../services/otp.service');
const { signToken } = require('../utils/jwt');
const { mobileLookupVariants, normalizeMobile } = require('../utils/mobile');
const { ensureLoginActivityLocationColumns } = require('../utils/db-capabilities');
const { magicLinkExpiryMinutes, magicLinkRateLimitSeconds } = require('../config/env');

const notRegisteredMessage = 'User is not registered. Contact the company at mycrowbee@gmail.com.';
const fallbackSuperAdminNumbers = new Set(['9747917623']);
const MAX_PIN_ATTEMPTS = 4;


function generateLoginToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function enforceMagicLinkRateLimit(normalizedMobile) {
  const latestToken = await prisma.loginToken.findFirst({
    where: { mobile: normalizedMobile },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true }
  });

  if (!latestToken) return;

  const retryAfterMs = (latestToken.createdAt.getTime() + (magicLinkRateLimitSeconds * 1000)) - Date.now();
  if (retryAfterMs > 0) {
    const error = new Error(`Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before requesting another link.`);
    error.status = 429;
    throw error;
  }
}

function resolveMagicLinkUserName(user, providedName) {
  if (providedName && String(providedName).trim()) return String(providedName).trim();
  if (user?.name && String(user.name).trim()) return String(user.name).trim();
  return 'User';
}

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


async function requestMagicLink(req, res, next) {
  try {
    const { mobile, whatsappNumber, role, name } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);

    if (!normalizedMobile) {
      return res.status(400).json({ success: false, message: 'Valid mobile number is required.' });
    }

    if (!['barber', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be barber, staff, or admin.' });
    }

    let user = null;

    if (role === 'barber' || role === 'staff') {
      user = await getPortalUserByRole(role, normalizedMobile);
      if (!user) {
        return res.status(404).json({ success: false, message: notRegisteredMessage });
      }
    } else if (role === 'admin') {
      const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
      const existingAdminUser = await findExistingAdminUser(normalizedMobile);

      if (!authorizedAdmin && !existingAdminUser) {
        return res.status(404).json({ success: false, message: notRegisteredMessage });
      }

      user = existingAdminUser;
    }

    await enforceMagicLinkRateLimit(normalizedMobile);

    const token = generateLoginToken();
    const expiresAt = new Date(Date.now() + (magicLinkExpiryMinutes * 60 * 1000));

    await prisma.loginToken.create({
      data: {
        mobile: normalizedMobile,
        token,
        expiresAt
      }
    });

    await sendWhatsAppMagicLink(normalizedMobile, resolveMagicLinkUserName(user, name), token);

    return res.json({
      success: true,
      message: 'Verification link sent successfully',
      expiresInSeconds: magicLinkExpiryMinutes * 60
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyLoginToken(req, res, next) {
  try {
    const token = String(req.query.t || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'Missing token' });
    }

    const record = await prisma.loginToken.findUnique({
      where: { token }
    });

    if (!record) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    if (record.used) {
      return res.status(401).json({ success: false, error: 'Token already used' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }

    await prisma.loginToken.update({
      where: { token },
      data: { used: true }
    });

    return res.json({
      success: true,
      mobile: record.mobile
    });
  } catch (error) {
    return next(error);
  }
}

async function requestOtp(req, res, next) {
  try {
    const { mobile, whatsappNumber, role } = req.body;
    const normalizedMobile = normalizeMobile(whatsappNumber || mobile);

    // eslint-disable-next-line no-console
    console.log('OTP request received', { role, mobile: normalizedMobile });

    if (role === 'barber' || role === 'staff') {
      const user = await getPortalUserByRole(role, normalizedMobile);
      if (!user) {
        return res.status(404).json({ success: false, message: notRegisteredMessage });
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

      return res.json({ success: true, message: 'OTP sent successfully' });
    }

    if (role === 'admin') {
      const authorizedAdmin = await findAuthorizedAdminNumber(normalizedMobile);
      const existingAdminUser = await findExistingAdminUser(normalizedMobile);

      if (!authorizedAdmin && !existingAdminUser) {
        return res.status(404).json({ success: false, message: notRegisteredMessage });
      }
    }

    await sendOtp(normalizedMobile);
    // eslint-disable-next-line no-console
    console.log('OTP sent successfully', { role, mobile: normalizedMobile });
    return res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    if (error.status === 502) {
      // eslint-disable-next-line no-console
      console.error('OTP request failed', {
        mobile: req.body?.whatsappNumber || req.body?.mobile,
        error: error.message,
        details: error.details || null
      });

      return res.status(502).json({
        success: false,
        message: 'Failed to send OTP',
        error: error.message || 'We could not deliver your OTP/PIN on WhatsApp. Please retry in a moment.',
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


const FIRST_LOGIN_CODE_EXPIRY_MINUTES = 5;
const FIRST_LOGIN_REQUEST_WINDOW_SECONDS = 60;

function roleToLegacy(userRole) {
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return 'admin';
  if (userRole === 'SERVICE_STAFF') return 'staff';
  return 'stylist';
}

async function checkUser(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.query.mobile);
    if (!normalizedMobile) return res.status(400).json({ message: 'Valid mobile number is required.' });

    const user = await prisma.user.findFirst({
      where: { mobile: { in: mobileLookupVariants(normalizedMobile) } },
      select: { id: true, role: true, firstLogin: true }
    });

    if (!user) return res.json({ exists: false });

    return res.json({ exists: true, firstLogin: Boolean(user.firstLogin), role: roleToLegacy(user.role) });
  } catch (error) {
    return next(error);
  }
}

async function verifyCode(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.body.mobile);
    const code = String(req.body.code || '').trim();
    if (!normalizedMobile || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Valid mobile and 6 digit code are required.' });
    }

    const record = await prisma.verificationCode.findFirst({
      where: { mobile: normalizedMobile, code, used: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } });
    return res.json({ verified: true });
  } catch (error) {
    return next(error);
  }
}

async function checkVerification(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.query.mobile);
    if (!normalizedMobile) {
      return res.status(400).json({ message: 'Valid mobile number is required.' });
    }

    const latestRecord = await prisma.verificationCode.findFirst({
      where: { mobile: normalizedMobile },
      orderBy: { createdAt: 'desc' },
      select: { used: true, expiresAt: true }
    });

    const verified = Boolean(latestRecord?.used && latestRecord.expiresAt >= new Date());
    return res.json({ verified });
  } catch (error) {
    return next(error);
  }
}

async function setPin(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.body.mobile);
    const pin = String(req.body.pin || '').trim();
    const deviceId = String(req.body.deviceId || '').trim();

    if (!normalizedMobile || !/^\d{4}$/.test(pin) || !deviceId) {
      return res.status(400).json({ message: 'Valid mobile, 4 digit PIN and deviceId are required.' });
    }

    const user = await prisma.user.findFirst({
      where: { mobile: { in: mobileLookupVariants(normalizedMobile) } }
    });

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const pinHash = await bcrypt.hash(pin, 10);

    await prisma.$transaction([
      prisma.device.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId } },
        update: { pinHash },
        create: { userId: user.id, deviceId, pinHash }
      }),
      prisma.user.update({ where: { id: user.id }, data: { firstLogin: false, pinAttempts: 0 } })
    ]);

    const token = signToken({ sub: user.id, role: user.role, mobile: user.mobile });
    return res.json({ success: true, token, user: { id: user.id, mobile: user.mobile, role: user.role } });
  } catch (error) {
    return next(error);
  }
}

async function loginWithDevicePin(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.body.mobile);
    const pin = String(req.body.pin || '').trim();
    const deviceId = String(req.body.deviceId || '').trim();

    if (!normalizedMobile || !/^\d{4}$/.test(pin) || !deviceId) {
      return res.status(400).json({ message: 'Valid mobile, 4 digit PIN and deviceId are required.' });
    }

    const user = await prisma.user.findFirst({
      where: { mobile: { in: mobileLookupVariants(normalizedMobile) } }
    });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const device = await prisma.device.findUnique({
      where: { userId_deviceId: { userId: user.id, deviceId } }
    });

    if (!device) {
      return res.status(403).json({ message: 'New device detected. WhatsApp verification required.', requiresVerification: true });
    }

    if ((user.pinAttempts || 0) >= 5) {
      return res.status(403).json({ message: 'PIN attempts exceeded. Verify WhatsApp again.', requiresVerification: true });
    }

    const validPin = await bcrypt.compare(pin, device.pinHash);
    if (!validPin) {
      const updated = await prisma.user.update({ where: { id: user.id }, data: { pinAttempts: { increment: 1 } }, select: { pinAttempts: true } });
      return res.status(400).json({ message: 'Incorrect PIN.', attempts: updated.pinAttempts, remainingAttempts: Math.max(0, 5 - updated.pinAttempts) });
    }

    await prisma.user.update({ where: { id: user.id }, data: { pinAttempts: 0 } });
    const token = signToken({ sub: user.id, role: user.role, mobile: user.mobile });
    return res.json({ success: true, token, user: { id: user.id, mobile: user.mobile, role: user.role } });
  } catch (error) {
    return next(error);
  }
}

async function whatsappWebhook(req, res, next) {
  try {
    const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        const message = value?.messages?.[0];
        if (!message) continue;

        const text = String(message.text?.body || '').trim().toLowerCase();
        const mobile = normalizeMobile(message.from);
        if (!mobile || text !== 'hi') continue;

        const user = await prisma.user.findFirst({
          where: { mobile: { in: mobileLookupVariants(mobile) } },
          select: { id: true }
        });
        if (!user) continue;

        const latest = await prisma.verificationCode.findFirst({
          where: { mobile },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });

        if (latest && (Date.now() - latest.createdAt.getTime()) < (FIRST_LOGIN_REQUEST_WINDOW_SECONDS * 1000)) {
          continue;
        }

        const code = `${Math.floor(100000 + Math.random() * 900000)}`;
        const expiresAt = new Date(Date.now() + (FIRST_LOGIN_CODE_EXPIRY_MINUTES * 60 * 1000));

        await prisma.verificationCode.create({ data: { mobile, code, expiresAt } });
        await sendVerificationCodeMessage(mobile, code);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requestOtp,
  verifyOtpLogin,
  loginWithPin,
  me,
  logout,
  checkAdminEligibility,
  requestMagicLink,
  verifyLoginToken,
  checkUser,
  verifyCode,
  checkVerification,
  setPin,
  loginWithDevicePin,
  whatsappWebhook
};
