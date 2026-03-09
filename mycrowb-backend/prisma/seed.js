const prisma = require('../src/config/prisma');

async function ensureAdmin({ mobile, name, department }) {
  const user = await prisma.user.upsert({
    where: { mobile },
    update: { name, role: 'ADMIN' },
    create: { mobile, name, role: 'ADMIN' }
  });

  await prisma.admin.upsert({
    where: { userId: user.id },
    update: { department },
    create: { userId: user.id, department }
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
    name: 'Abdul Kareem T',
    department: 'Operations'
  });
}

main().finally(async () => prisma.$disconnect());
