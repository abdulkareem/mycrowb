const prisma = require('../config/prisma');

let shopRegistrationReady;

async function ensureShopRegistrationNumberColumn() {
  if (shopRegistrationReady) {
    return;
  }

  await prisma.$executeRawUnsafe('ALTER TABLE "BarberShop" ADD COLUMN IF NOT EXISTS "shopRegistrationNumber" TEXT');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "BarberShop_shopRegistrationNumber_key" ON "BarberShop"("shopRegistrationNumber")');

  shopRegistrationReady = true;
}

module.exports = { ensureShopRegistrationNumberColumn };
