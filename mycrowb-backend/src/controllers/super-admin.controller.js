const prisma = require('../config/prisma');
const { normalizeMobile } = require('../utils/mobile');

async function listAuthorizedAdmins(_req, res, next) {
  try {
    const admins = await prisma.authorizedAdminNumber.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(admins);
  } catch (error) {
    next(error);
  }
}

async function createAuthorizedAdmin(req, res, next) {
  try {
    const normalizedMobile = normalizeMobile(req.body.mobile);
    if (!normalizedMobile) {
      return res.status(400).json({ message: 'Valid mobile number is required.' });
    }

    const isSuperAdmin = Boolean(req.body.isSuperAdmin);

    const created = await prisma.authorizedAdminNumber.upsert({
      where: { mobile: normalizedMobile },
      update: {
        isSuperAdmin,
        isActive: true,
        createdBy: req.user.mobile
      },
      create: {
        mobile: normalizedMobile,
        isSuperAdmin,
        createdBy: req.user.mobile
      }
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function listLoginActivities(req, res, next) {
  try {
    const role = req.query.role;
    const where = role ? { role } : {};

    const activities = await prisma.loginActivity.findMany({
      where,
      orderBy: { loginAt: 'desc' },
      include: {
        user: {
          select: { id: true, mobile: true, name: true, role: true }
        }
      },
      take: 500
    });

    res.json(activities);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listAuthorizedAdmins,
  createAuthorizedAdmin,
  listLoginActivities
};
