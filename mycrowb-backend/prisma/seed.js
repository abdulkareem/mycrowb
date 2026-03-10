const prisma = require('../src/config/prisma');
const { normalizeMobile } = require('../src/utils/mobile');

async function ensureAdmin({ mobile, name, department, isSuperAdmin = false }) {
  const normalizedMobile = normalizeMobile(mobile);
  const role = isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';

  const user = await prisma.user.upsert({
    where: { mobile: normalizedMobile },
    update: { name, role },
    create: { mobile: normalizedMobile, name, role }
  });

  if (!isSuperAdmin) {
    await prisma.admin.upsert({
      where: { userId: user.id },
      update: { department },
      create: { userId: user.id, department }
    });
  }

  await prisma.authorizedAdminNumber.upsert({
    where: { mobile: normalizedMobile },
    update: {
      isActive: true,
      isSuperAdmin,
      createdBy: 'seed'
    },
    create: {
      mobile: normalizedMobile,
      isActive: true,
      isSuperAdmin,
      createdBy: 'seed'
    }
  });
}

async function main() {
  await ensureAdmin({
    mobile: '+910000000001',
    name: 'Platform Admin',
    department: 'Operations'
  });

  await ensureAdmin({
    mobile: '9747917623',
    name: 'Super Admin',
    department: 'Operations',
    isSuperAdmin: true
  });
}

main().finally(async () => prisma.$disconnect());
