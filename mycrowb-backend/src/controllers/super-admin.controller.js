const prisma = require('../config/prisma');
const { normalizeMobile } = require('../utils/mobile');
const { ensureLoginActivityLocationColumns } = require('../utils/db-capabilities');

async function syncAdminUserRole(mobile, isSuperAdmin, isActive) {
  const normalizedMobile = normalizeMobile(mobile);
  if (!normalizedMobile) return;

  const user = await prisma.user.findFirst({
    where: {
      mobile: {
        in: [normalizedMobile, `+91${normalizedMobile}`]
      }
    }
  });

  if (!user && isActive) {
    await prisma.user.create({
      data: {
        mobile: normalizedMobile,
        name: 'Admin User',
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'
      }
    });
    return;
  }

  if (!user) return;

  if (!isActive && user.role === 'SUPER_ADMIN') {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    return;
  }

  if (isActive) {
    const nextRole = isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';
    if (user.role !== nextRole) {
      await prisma.user.update({ where: { id: user.id }, data: { role: nextRole } });
    }
  }
}

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

    await syncAdminUserRole(created.mobile, created.isSuperAdmin, created.isActive);

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

async function updateAuthorizedAdmin(req, res, next) {
  try {
    const existing = await prisma.authorizedAdminNumber.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Admin number not found.' });

    const data = {};
    if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
    if (typeof req.body.isSuperAdmin === 'boolean') data.isSuperAdmin = req.body.isSuperAdmin;

    if (!Object.keys(data).length) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const updated = await prisma.authorizedAdminNumber.update({
      where: { id: req.params.id },
      data
    });

    await syncAdminUserRole(updated.mobile, updated.isSuperAdmin, updated.isActive);

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteAuthorizedAdmin(req, res, next) {
  try {
    const existing = await prisma.authorizedAdminNumber.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Admin number not found.' });

    await prisma.authorizedAdminNumber.delete({ where: { id: req.params.id } });
    await syncAdminUserRole(existing.mobile, false, false);

    res.json({ message: 'Admin number deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

async function listLoginActivities(req, res, next) {
  try {
    const role = req.query.role;
    const where = role ? { role } : {};

    await ensureLoginActivityLocationColumns();

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
  updateAuthorizedAdmin,
  deleteAuthorizedAdmin,
  listLoginActivities
};
