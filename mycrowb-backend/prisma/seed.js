const prisma = require('../src/config/prisma');

async function main() {
  const admin = await prisma.user.upsert({
    where: { mobile: '+910000000001' },
    update: {},
    create: { mobile: '+910000000001', name: 'Platform Admin', role: 'ADMIN' }
  });

  await prisma.admin.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, department: 'Operations' }
  });
}

main().finally(async () => prisma.$disconnect());
